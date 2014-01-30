var MMB = {
    pages: {},
    category_record: null,
    category: null,
    lang: null,
    dropbox_client: null,
    dropbox_ok: false,
    moneybook: null,
    datastore: {
        content: null,
        etc: null,
        auto_complete: null
    },
    memo_data_record: null,
    memo_data: null,
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
                datastoreManager = MMB.dropbox_client.getDatastoreManager();

                datastoreManager.openDefaultDatastore(function (error, datastore) {
                    if (error) {
                        alert('Error opening default datastore: ' + error);
                    }

                    MMB.datastore.content = datastore.getTable('moneybook_content');
                    MMB.datastore.etc = datastore.getTable('moneybook_etc');
                    MMB.datastore.auto_complete = datastore.getTable('moneybook_auto_complete');
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
    set_category: function(){
        if(this.category_record){
            return;
        }

        if( ! MMB.datastore.etc){
            MMB.category = MMB.get_setting_obj('category');
            setTimeout(MMB.set_category, 500);
            return;
        }

        MMB.category_record = MMB.datastore.etc.query({
            key: 'category-list'
        })[0];

        if( ! MMB.category_record){
            MMB.category = MMB.get_ex_category();
            MMB.category_record = MMB.datastore.etc.insert({
                key: 'category-list',
                value: JSON.stringify(MMB.category)
            });
        }else{
            MMB.category = JSON.parse(MMB.category_record.get('value'));
        }

    },
    get_ex_category: function(){
        var ex_cat = {};

        ex_cat.withdrawal = this.get_ex_category_inner('withdrawal');
        ex_cat.deposit = this.get_ex_category_inner('deposit');

        return ex_cat;
    },
    get_ex_category_inner: function(behavior_type){
        var temp,
            behavior_cat = [],
            lang = MMB.get_lang();

        _.forEach(MMB_EX_Category[lang][behavior_type], function(entry){
            temp = entry.split(':');
            behavior_cat.push({
                cat1: temp[0],
                cat2: temp[1]
            })
        });

        return behavior_cat;
    },
    get_accounts: function(){
        if(localStorage.account){
            return JSON.parse(localStorage.account);
        }else{
            return [];
        }
    },
    register: function(data){

        if(data.behavior_type === 'transfer'){
            delete data.cat1;
            delete data.cat2;
        }

        // for auto complete
        this.update_auto_complete_info(data);

        // for statistics
        this.update_statistics_info(data);

        return MMB.datastore.content.insert(data);
    },

    update_auto_complete_info: function(data){
        this.update_memo_data(data);
        this.update_memo_related_data(data);
    },

    update_account_list: function(account_name){
        var account_record, account, account_string;

        account_record = MMB.datastore.etc.query({key: 'account'})[0];

        if( ! account_record){
            account = [];
        }else{
            account = JSON.parse(account_record.get('value'));
        }

        if(_.indexOf(account, account_name) === -1){
            account.push(account_name);
            account_string = JSON.stringify(account);
            localStorage['account'] = account_string;
            if(account_record){
                account_record.update({
                    value: account_string
                });
            }else{
                MMB.datastore.etc.insert({
                    key: 'account',
                    value: account_string
                });
            }
        }
    },

    update_statistics_info: function (data){

        var account_info, new_amount,
            update_targets = ['whole', 'account', 'cat1', 'cat2'],
            update_ranges = ['whole', 'yearly', 'monthly'],
            type_name,
            data_withdrawal,
            data_deposit,
            year,
            month,
            that = this;

        _.forEach(update_ranges, function(entry){

            switch(entry){
                case 'whole':
                    year = 'whole';
                    month = 'whole';
                    break;
                case 'yearly':
                    year = data.year;
                    month = 'whole';
                    break;
                case 'monthly':
                    year = data.year;
                    month = data.month;
                    break;
                // no default.
            }

            _.forEach(update_targets, function(type){
                type_name = (type === 'whole' ? 'whole' : data[type]);
                if( ! type_name || ! type_name.trim()){
                    return true;
                }

                switch(data.behavior_type){
                    case 'withdrawal':
                        that.update_amount(type, type_name, year, month, data.amount * -1);
                        break;
                    case 'deposit':
                        that.update_amount(type, type_name, year, month, data.amount);
                        break;
                    case 'transfer':
                        data_withdrawal = _.clone(data);
                        data_deposit = _.clone(data);

                        // set like withdrawal
                        type_name = (type === 'whole' ? 'whole' : data_withdrawal[type]);
                        delete data_withdrawal.to_account;
                        that.update_amount(type, type_name, year, month, data.amount * -1);

                        // set like deposti
                        data_deposit.account = data_deposit.to_account;
                        delete data_deposit.to_account;
                        type_name = (type === 'whole' ? 'whole' : data_deposit[type]);
                        that.update_amount(type, type_name, year, month, data.amount);

                        break;

                    // no default
                }
            });
        });

        return this;
    },

    update_amount: function(type, type_name, year, month, amount){

        var info, new_amount;

        info = this.datastore.etc.query({
            key: type + '_info',
            name: type_name,
            year: year,
            month: month
        })[0];

        if( ! info){
            info = this.datastore.etc.insert({
                key: type + '_info',
                name: type_name,
                year: year,
                month: month,
                amount: 0
            });
        }

        new_amount = parseFloat(info.get('amount')) + parseFloat(amount);

        info.update({
            amount: new_amount
        });

        return this;
    },

    init_memo_data: function(){

        if(MMB.datastore.auto_complete === null){
            setTimeout(MMB.init_memo_data, 500);
            return false;
        }

        MMB.memo_data_record = MMB.datastore.auto_complete.query({
            key: 'memo_data'
        })[0];
        if( ! MMB.memo_data_record){
            MMB.memo_data_record = MMB.datastore.auto_complete.insert({
                key: 'memo_data',
                value: JSON.stringify([])
            });
        }
        MMB.memo_data = JSON.parse(MMB.memo_data_record.get('value'));
    },

    update_memo_data: function(data){
        var memo_info = _.find(this.memo_data, function(entry){
            return (entry.key == data.memo);
        });

        if(memo_info === undefined){
            this.memo_data.push({
                key: data.memo,
                count: 1
            });
        }else{
            memo_info.count++
        }

        MMB.memo_data_record.update({
            value: JSON.stringify(MMB.memo_data)
        });
    },

    update_memo_related_data: function(data){
        var memo_related, record, related, found,
            related_items = ['amount', 'category', 'account'],
            data_clone = _.clone(data),
            category_depth = MMB.get_setting('category_depth');

        if(category_depth == 2){
            data_clone.category = data_clone.cat1 + ':' + data_clone.cat2;
        }else if(category_depth == 1){
            data_clone.category = data_clone.cat1;
        }

        memo_related = this.datastore.auto_complete.query({
            type: 'memo_related',
            memo: data_clone.memo
        })[0];

        if(memo_related === undefined){
            related = {};
            _.forEach(related_items, function(entry){
                related[entry] = [
                    {
                        key: data_clone[entry],
                        count: 1
                    }
                ];
            });
            record = {
                type: 'memo_related',
                memo: data_clone.memo,
                related: JSON.stringify(related)
            }
            this.datastore.auto_complete.insert(record);
        }else{
            related = JSON.parse(memo_related.get('related'));

            _.forEach(related_items, function(entry){
                found = _.find(related[entry], function(target_item){
                    return (target_item.key == data_clone[entry]);
                });
                if(found === undefined ){
                    related[entry].push({
                        key: data_clone[entry],
                        count: 1
                    });
                }else{
                    found.count++
                }
            });

            memo_related.update({
                related: JSON.stringify(related)
            });
        }
    }


};
