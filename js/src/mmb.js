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
        etc: null,
        auto_complete: null,
        account_list: null,
        category_list: null
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
                MMB.datastoreManager = MMB.dropbox_client.getDatastoreManager();

                MMB.datastoreManager.openDefaultDatastore(function (error, datastore) {
                    if (error) {
                        alert('Error opening default datastore: ' + error);
                    }

                    MMB.datastore.content = datastore.getTable('moneybook_content');
                    MMB.datastore.etc = datastore.getTable('moneybook_etc');
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
        var data2;

        data = this.update_accounts(data);
        delete data.account;
        if(data.to_account){
            delete data.to_account;
        }

        if(data.behavior_type === 'transfer'){
            delete data.cat1;
            delete data.cat2;
        }else{
            this.update_category(data);
        }

        // for auto complete
        this.update_auto_complete_info(data);

        // for statistics
//        this.update_statistics_info(data);

        return MMB.datastore.content.insert(data);
    },

    update_auto_complete_info: function(data){
        this.update_memo_data(data);
        this.update_memo_related_data(data);
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
                in_balance: 'yes'
            });

            alert( account_name + polyglot.t(" is added to account list. Go account setting, and set properties."));
        }

        return this_account.getId();
    },

    update_category: function(data){

        var cat_data,
            this_cat;

        if(data.behavior_type == 'transfer'){
            return false;
        }

        cat_data = {
            behavior_type: data.behavior_type,
            cat1: data.cat1,
            cat2: data.cat2
        };

        this_cat = MMB.datastore.category_list.query(cat_data);
        if(this_cat.length == 0){
            MMB.datastore.category_list.insert(cat_data);
        }
    },

    init_memo_data: function(){

        if(MMB.datastore.auto_complete === null){
            MMB.memo_data = MMB.get_setting_obj('memo_data');
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
        MMB.set_setting_obj('memo_data', MMB.memo_data);
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
            data_clone = _.clone(data);

        data_clone.categories = data_clone.cat1 + ':' + data_clone.cat2;

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
    },

    get_all_memo_related: function(){
        var records,
            objs = [];

        if( ! MMB.datastore.auto_complete){
            setTimeout(MMB.get_all_memo_related, 500);
            return false;
        }
        records = MMB.datastore.auto_complete.query({
            type: 'memo_related'
        });
        _.forEach(records, function(t){
            objs.push({
                memo: t.get('memo'),
                type: t.get('type'),
                related: JSON.parse(t.get('related'))
            });
        });
        return objs;
    },
    mock: {
        get: function(name){
            return '';
        },
        getId: function(){
            return '';
        }
    }

};
