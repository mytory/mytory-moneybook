var MMB = {
    network_enabled: false,
    pages: {},
    lang: null,
    dropbox_client: null,
    dropbox_ok: false,
    moneybook: null,
    datastoreManager: null,
    datastore: {
        content: null,
        auto_complete: null,
        account_list: null,
        category_list: null
    },
    router: null,
    check_dropbox: function(){
        var datastoreManager;

        try{
            this.dropbox_client = new Dropbox.Client({key: MMB_Config.app_key});

            // Try to finish OAuth authorization.
            this.dropbox_client.authenticate({interactive: false}, function (error) {
                if (error) {
                    alert(polyglot.t('Authentication error: ') + error);
                }
            });

            if(this.dropbox_client.isAuthenticated()){
                this.dropbox_ok = true;
                // get datastore api
                MMB.datastoreManager = MMB.dropbox_client.getDatastoreManager();

                MMB.datastoreManager.openDefaultDatastore(function (error, datastore) {
                    if (error) {
                        alert('Error opening default datastore: ' + error);
                    }

                    MMB.datastore.content = datastore.getTable('moneybook_content');
                    MMB.datastore.auto_complete = datastore.getTable('moneybook_auto_complete');
                    MMB.datastore.account_list = datastore.getTable('moneybook_account_list');
                    MMB.datastore.category_list = datastore.getTable('moneybook_category_list');
                });
                return true;

            }else{
                this.render('dropbox_sign_in');
                return false;
            }


        }catch(e){
            this.render('no_network');
            return false;
        }
    },
    set_polyglot: function(){
        polyglot.extend(Lang[this.get_lang()]);
    },
    set_setting: function(item_name, value){
        localStorage["setting_" + item_name] = value;
    },
    set_setting_obj: function(item_name, obj){
        this.set_setting(item_name, JSON.stringify(obj));
    },
    get_setting: function(item_name){
        return localStorage['setting_' + item_name];
    },
    get_setting_obj: function(item_name){
        if(this.get_setting(item_name)){
            return JSON.parse(this.get_setting(item_name));
        }
    },
    get_lang: function(){

        if(this.lang){
            return this.lang;
        }

        var user_lang = navigator.language || navigator.userLanguage,
            lang = this.get_setting('language');

        if(lang == null){
            user_lang = user_lang.substr(0, 2).toLowerCase();

            if(user_lang == 'ko'){
                lang = 'ko';
            }else{
                lang = 'en';
            }
        }

        this.lang = lang;

        return lang;
    },
    show_navbar: function(){
        this.render('navbar');
    },
    render: function(page_name, vars){
        var that = this,
            table_ready = true;

        _.forEach(MMB.datastore, function(table){
            if( ! table){
                table_ready = false;
                return false;
            }
        });

        if( ! table_ready){
            setTimeout(function(){
                that.render(page_name, vars);
            }, 200);
            return false;
        }

        if(
            MMB_Config && this.dropbox_ok ||
                page_name == 'need_config' ||
                page_name == 'dropbox_sign_in' ||
                page_name == 'no_network'
        ){
            if(this.pages[page_name]){
                this.pages[page_name].render(vars);
            }else{
                this.pages[page_name] = new MMB_Backbone['View_' + page_name];
                this.pages[page_name].render(vars);
            }
        }
        $('.js-navbar li.active').removeClass('active');
        $('[href="' + location.hash + '"]').parents('li').addClass('active');
        $('.page-loader').hide();
    },
    show_start_page: function(){
        if( ! MMB_Config){
            this.render('need_config');
        }else if( ! navigator.onLine){
            this.render('no_network');
        }else if( ! this.dropbox_ok){
            this.render('dropbox_sign_in');
        }else{
            this.render('weekly');
        }
    },
    if_checked: function(db_value, field_value){
        if(db_value == field_value){
            return ' checked ';
        }else{
            return '';
        }
    },
    init_category_list: function(){
        if( ! MMB.datastore.category_list){
            setTimeout(MMB.init_category_list, 200);
            return false;
        }
        var category_list = MMB.datastore.category_list.query();
        if(category_list.length == 0){
            MMB.insert_ex_category_list();
        }
    },
    insert_ex_category_list: function(){
        var category_list = this.get_ex_category();
        _.forEach(category_list, function(cat){
            MMB.datastore.category_list.insert(cat);
        });
    },
    get_ex_category: function(behavior_type){
        var temp,
            behavior_cat = [],
            lang = MMB.get_lang();

        _.forEach(['deposit', 'withdrawal'], function(behavior_type){
            _.forEach(MMB_EX_Category[lang][behavior_type], function(entry){
                temp = entry.split(':');
                behavior_cat.push({
                    behavior_type: behavior_type,
                    cat1: temp[0],
                    cat2: temp[1]
                })
            });
        });

        return behavior_cat;
    },

    register: function(data){
        var data2,
            item;

        this.filter_data(data);

        data = this.update_accounts(data);
        delete data.account;
        if(data.to_account){
            delete data.to_account;
        }

        if(data.behavior_type === 'transfer'){
            delete data.cat1;
            delete data.cat2;
        }else{
            data = this.update_category(data);
        }

        // for auto complete
        this.update_auto_complete_info(data);

        if( ! data.id){

            // insert
            return MMB.datastore.content.insert(data);

        }else{

            // update
            item = MMB.datastore.content.get(data.id);
            data2 = _.clone(data);
            delete data2.id;
            item.update(data2);
            return item;
        }
    },

    filter_data: function(data){
        data.amount = parseFloat(data.amount);
    },

    delete_auto_complete_info: function(item){
        var result,
            targets,
            data;

        data = item.getFields();
        targets = ['memo', 'amount', 'account_id', 'cat_id', 'to_account_id'];

        _.forEach(targets, function(key){
            if( ! data[key]){
                return true;
            }

            result = MMB.datastore.auto_complete.query({
                memo: data.memo,
                key: key,
                value: data[key]
            });

            if(result[0].get('count') === 1){
                result[0].deleteRecord();
            }else{
                result[0].update({
                    count: result[0].get('count') - 1
                });
            }
        });

        return this;
    },

    update_auto_complete_info: function(data){
        var result,
            targets;

        targets = ['memo', 'amount', 'account_id', 'cat_id', 'to_account_id'];

        _.forEach(targets, function(key){
            if( ! data[key]){
                return true;
            }

            result = MMB.datastore.auto_complete.query({
                memo: data.memo,
                key: key,
                value: data[key]
            });

            if(result.length === 0){

                MMB.datastore.auto_complete.insert({
                    memo: data.memo,
                    key: key,
                    value: data[key],
                    count: 1
                });

            }else{

                result[0].update({
                    count: result[0].get('count') + 1
                });

            }
        });
    },

    update_accounts: function(data){
        var account_id,
            to_account_id;
        data.account_id = this.update_accounts_inner(data.account);
        if(data.to_account){
            data.to_account_id = this.update_accounts_inner(data.to_account);
        }
        return data;
    },

    update_accounts_inner: function(account_name){
        var this_account,
            account_list;

        account_list = MMB.datastore.account_list.query();
        this_account = _.find(account_list, function(account){
            return ( account.get('name') === account_name );
        });

        if( ! this_account ){
            this_account = MMB.datastore.account_list.insert({
                name: account_name,
                owner: 'mine',
                in_balance: 'yes',
                whether_savings: 'no'
            });

            alert( account_name + polyglot.t(" is added to account list. Go account setting, and set properties."));
        }

        return this_account.getId();
    },

    update_category: function(data){

        var cat_data,
            this_cat,
            result;

        if(data.behavior_type == 'transfer'){
            return false;
        }

        cat_data = {
            behavior_type: data.behavior_type,
            cat1: data.cat1,
            cat2: data.cat2
        };

        result = MMB.datastore.category_list.query(cat_data);
        if(result.length == 0){
            this_cat = MMB.datastore.category_list.insert(cat_data);
        }else{
            this_cat = result[0];
        }

        delete data.cat1;
        delete data.cat2;
        data.cat_id = this_cat.getId();

        return data;
    },

    mock: {
        get: function(name){
            return '';
        },
        getId: function(){
            return '';
        }
    },

    get_cat_id_by_category: function(category_name){
        var cat = category_name.split(':'),
            result;

        if(category_name.split(':').length < 2){
            alert(polyglot.t('Enter category to two level using colon(:).'));
            return false;
        }else if(category_name.split(':').length > 2){
            alert(polyglot.t('Category level can be only 2. And you cannot use colon(:) on category name.'));
            return false;
        }
        result = MMB.datastore.category_list.query({
            cat1: cat[0],
            cat2: cat[1]
        });

        if(result.length === 0){
            alert(polyglot.t('There is no such category.'));
            return false;
        }

        return result[0].getId();

    },

    get_account_id_by_name: function(name){
        var result = MMB.datastore.account_list.query({
            name: name
        });

        if(result.length === 0){
            alert(polyglot.t('There is no such account.'));
            return false;
        }

        return result[0].getId();
    },

    update_auto_complete_record: function(memo, key, value, count){

        var auto_complete,
            new_count,
            result;

        if(count < 0){
            auto_complete = MMB.datastore.auto_complete.query({
                memo: memo,
                key: key,
                value: value
            })[0];

            new_count = auto_complete.get('count') + count;

            if(new_count === 0){
                auto_complete.deleteRecord();
            }else{
                auto_complete.update({
                    count: new_count
                });
            }
        }else if(count > 0){
            result = MMB.datastore.auto_complete.query({
                memo: memo,
                key: key,
                value: value
            });

            if(result.length === 0){
                MMB.datastore.auto_complete.insert({
                    memo: memo,
                    key: key,
                    value: value,
                    count: 1
                });
            }else{
                new_count = result[0].get('count') + count;
                result[0].update({
                    count: new_count
                });
            }
        }
    },

    get_items_about_account: function(account_id){

        var account_list,
            to_account_list;

        account_list = MMB.datastore.content.query({
            account_id: account_id
        });
        to_account_list = MMB.datastore.content.query({
            to_account_id: account_id
        });

        return account_list.concat(to_account_list);
    },

    get_account_balance: function(account_id){
        var item_list = MMB.get_items_about_account(account_id),
            account_balance = 0;

        _.forEach(item_list, function(item){

            // withdrawal
            if(item.get('behavior_type') === 'withdrawal'){
                account_balance -= item.get('amount');
            }

            // deposit
            if(item.get('behavior_type') === 'deposit'){
                account_balance += item.get('amount');
            }

            // transfer out
            if(item.get('behavior_type') === 'transfer' && item.get('account_id') === account_id){
                account_balance -= item.get('amount');
            }

            // transfer in
            if(item.get('behavior_type') === 'transfer' && item.get('to_account_id') === account_id){
                account_balance += item.get('amount');
            }
        });

        return account_balance;
    },

    get_balance: function(list){
        // 시나리오
        // 1. 그냥 수입 : 자산과 잔액에 더하면 된다.
        // 2. 그냥 지출 : 자산과 잔액에 빼면 된다.
        // 3. 은행에서 내 계좌로 이체(대출) : 은행은 마이너스 통장이 된다. 자산은 특별히 신경쓸 것 없다.
        //      다만 은행계좌의 돈을 잔액에 포함하면 안 된다. 수입이 된다.
        // 4. 내 계좌에서 은행으로 이체(대출 상환) : 자산은 마찬가지. 지출이 된다.
        // 5. 내 계좌에서 친구 빌려줌 계좌로 이체 : 친구 빌려줌 계좌는 잔액에 포함하면 안 된다. 자산은 그대로.
        //      지출이 되면 안 된다.
        // 6. 적금 : 자산에는 포함. 잔액엔 포함 안 한다. 지출이 되면 안 된다.

        var balance = 0,
            account,
            to_account;

        _.forEach(list, function(item){

            account = MMB.datastore.account_list.get(item.get('account_id'));
            if(item.get('to_account_id')){
                to_account = MMB.datastore.account_list.get(item.get('to_account_id'));
            }

            switch(item.get('behavior_type')){
                case 'withdrawal':
                    if(account.get('in_balance') === 'no'){
                        return true;
                    }
                    balance -= item.get('amount');

                    break;

                case 'deposit':
                    if(account.get('in_balance') === 'no'){
                        return true;
                    }
                    balance += item.get('amount');
                    break;

                case 'transfer':
                    if(account.get('in_balance') === 'yes'){
                        balance -= item.get('amount');
                    }
                    if(to_account.get('in_balance') === 'yes'){
                        balance += item.get('amount');
                    }

                // no default
            }
        });

        return balance;
    },

    get_year_list: function(){
        var item_list = MMB.datastore.content.query(),
            year_list = [];
        _.forEach(item_list, function(item){
            if(_.indexOf(year_list, item.get('year')) === -1){
                year_list.push(item.get('year'));
            }
        });
        year_list = _.sortBy(year_list, function(year){
            return year;
        });
        return year_list;
    },

    show_loader: function(){
        $('.page-loader').show();
    },

    add_lang_class_to_body: function(){
        $('body').addClass('body-lang-' + this.get_lang());
    },

    get_statistics: function(list){

        // 시나리오
        // 1. 그냥 수입      : 수입 - 내 소유 계좌에 돈이 들어오면 수입.
        // 2. 그냥 지출      : 지출 - 내 소유 계좌에서 돈이 나가면 지출.
        // 3. 돈 갚는다      : 지출성 이체 - 내 소유 계좌에서 다른 사람 소유 계좌로 돈이 나간다.
        // 4. 돈 빌린다      : 수입성 이체 - 다른 사람 소유 계좌에서 내 소유 계좌로 돈이 들어온다.
        // 5. 돈 꿔준다      : 지출성 이체 - 잔액에 포함되던 내 돈이 잔액에 포함 안 된다.
        // 6. 돈 돌려 받는다 : 수입성 이체 - 잔액에 표시 안 되던 내 돈이 잔액에 표시된다.
        // 5. 그냥 내 계좌 사이 이체 : 수입 지출에 카운트되면 안 된다.

        var account,
            to_account,
            withdrawal = 0,
            withdrawal_like_transfer = 0,
            deposit = 0,
            deposit_like_transfer = 0,
            savings = 0;

        _.forEach(list, function(item){
            account = MMB.datastore.account_list.get(item.get('account_id'));
            if(item.get('to_account_id')){
                to_account = MMB.datastore.account_list.get(item.get('to_account_id'));
            }

            // 그냥 지출
            if(item.get('behavior_type') === 'withdrawal'){
                withdrawal += item.get('amount');
            }

            // 그냥 수입
            if(item.get('behavior_type') === 'deposit'){
                deposit += item.get('amount');
            }

            if(item.get('behavior_type') === 'transfer'){
                if(account.get('owner') === 'mine' && to_account.get('owner') === 'mine'){
                    if(to_account.get('whether_savings') === 'yes'){

                        // 저금
                        savings += item.get('amount');
                    }else if(account.get('in_balance') === 'yes' && to_account.get('in_balance') === 'no'){

                        // 돈 꿔준다.
                        withdrawal_like_transfer += item.get('amount');
                    }else if(account.get('in_balance') === 'no' && to_account.get('in_balance') === 'yes'){

                        // 돈 돌려 받는다.
                        deposit_like_transfer += item.get('amount');
                    }
                }else if(account.get('owner') === 'mine' && to_account.get('owner') === 'others'){

                    // 돈 갚는다.
                    withdrawal_like_transfer += item.get('amount');
                }else if(account.get('owner') === 'others' && to_account.get('owner') === 'mine'){

                    // 돈 빌린다.
                    deposit_like_transfer += item.get('amount');
                }
            }
        });

        return {
            withdrawal: withdrawal,
            deposit: deposit,
            withdrawal_like_transfer: withdrawal_like_transfer,
            deposit_like_transfer: deposit_like_transfer,
            savings: savings
        };
    },

    print_balance_panel: function(){
        var list,
            balance;
        if( ! MMB.datastore.content){
            setTimeout(MMB.print_balance_panel, 100);
            return false;
        }
        list = MMB.datastore.content.query();
        balance = MMB.get_balance(list);
        $('.js-balance-panel .js-balance').text(MMB.util.number_format(balance));
        if($('.js-balance-panel').is(':not(":visible")')){
            $('.js-balance-panel').show();
        }
    }

};
