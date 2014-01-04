var polyglot = new Polyglot();

var MMB_Backbone = {

    View_navbar: Backbone.View.extend({
        el: '#navbar-collapse',
        template: _.template($('#navbar').html()),
        events: {
            "click .js-sign-out": "sign_out",
            "click [data-page]": "render_page"
        },
        sign_out: function(e){
            e.preventDefault();
            if(MMB.dropbox_ok){
                MMB.dropbox_client.signOut();
                MMB.dropbox_ok = false;
            }
            return this;
        },
        render: function(){
            $('#navbar-collapse').html(this.template());
            return this;
        },
        render_page: function(e){
            e.preventDefault();
            var page_name = $(e.target).data('page');
            MMB.render(page_name);
            return this;
        }
    }),

    View_need_config: Backbone.View.extend({
        template: _.template($('#page-need-config').html()),
        render: function(){
            $('.body').html(this.template());
            return this;
        }
    }),

    View_no_network: Backbone.View.extend({
        template: _.template($('#page-no-network').html()),
        render: function(){
            $('.body').html(this.template());
            return this;
        }
    }),

    View_dropbox_sign_in: Backbone.View.extend({
        el: ".body",
        template: _.template($('#page-dropbox-sign-in').html()),
        events: {
            "click .js-dropbox-sign-in": "dropbox_sign_in"
        },
        dropbox_sign_in: function(){
            MMB.dropbox_client = new Dropbox.Client({key: MMB_Config.app_key});

            // Try to finish OAuth authorization.
            MMB.dropbox_client.authenticate({interactive: true}, function (error) {
                if (error) {
                    alert('Authentication error: ' + error);
                }
            });
            return this;
        },
        render: function(){
            $('.body').html(this.template());
            return this;
        }
    }),

    View_register: Backbone.View.extend({
        el: '.body',
        template: _.template($('#page-register').html()),
        render: function(){
            var today = moment().format('YYYY-MM-DD'),
                vars,
                category_placeholder,
                tmp;

            tmp = _.random(0, MMB.category.length - 1);

            category_placeholder = MMB.category[tmp];

            vars = {
                today: today,
                category_placeholder: category_placeholder
            };
            $('.body').hide().html(this.template(vars)).fadeIn();
            return this;
        },
        events: {
            "submit .js-register-form": "register"
        },
        register: function(e){
            e.preventDefault();
            var data_arr = $('.js-register-form').serializeArray(),
                data = {},
                datastoreManager,
                inserted = [];
            _.forEach(data_arr, function(entry){
                data[entry.name] = entry.value;
            });

            // dropbox query
            if(MMB.moneybook){
                inserted.push(MMB.moneybook.insert(data));
            }else{
                datastoreManager = MMB.dropbox_client.getDatastoreManager();

                datastoreManager.openDefaultDatastore(function (error, datastore) {
                    if (error) {
                        alert('Error opening default datastore: ' + error);
                    }

                    MMB.moneybook = datastore.getTable('moneybook');
                    inserted.push(MMB.moneybook.insert(data));
                });
            }
            return this;
        }
    }),

    View_setting: Backbone.View.extend({
        el: ".body",
        template: _.template($('#page-setting').html()),
        events: {
            "click input" : "save_setting",
            "blur" : "save_setting"
        },
        render: function(){
            var vars;
            vars = {
                language: MMB.get_lang(),
                category_depth: MMB.get_category_depth()
            };
            $('.body').hide().html(this.template(vars)).fadeIn();
            return this;
        },
        save_setting: function(){
            var setting = {},
                value_obj = $('.js-form-setting').serializeArray();
            _.each(value_obj, function(obj){
                localStorage[obj.name] = obj.value;
            });
            MMB.reset_category();
            return this;
        }
    }),

    View_import: Backbone.View.extend({
        el: ".body",
        template: _.template($('#page-import').html()),
        render: function(){
            var vars = {};
            $('.body').hide().html(this.template(vars)).fadeIn();
            return this;
        }
    })
};

var MMB = {
    initialize: function(){
        var network = false;
        this.set_polyglot();
        this.set_category();
        network = this.check_dropbox();
        if(network){
            this.show_navbar();
            this.show_start_page();
            this.provide_data_source();
        }
    },
    pages: {},
    category: null,
    lang: null,
    dropbox_client: null,
    dropbox_ok: false,
    moneybook: null,
    check_dropbox: function(){
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
            }
            return true;

        }catch(e){
            this.render('no_network');
            return false;
        }
    },
    set_polyglot: function(){
        polyglot.extend(Lang[this.get_lang()]);
    },
    get_lang: function(){

        if(this.lang){
            return this.lang;
        }

        var user_lang = navigator.language || navigator.userLanguage,
            lang = localStorage.getItem('language');

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
    render: function(page_name){
        if(
            MMB_Config && this.dropbox_ok ||
                page_name == 'need_config' ||
                page_name == 'dropbox_sign_in' ||
                page_name == 'no_network'
        ){
            if(this.pages[page_name]){
                this.pages[page_name].render();
            }else{
                this.pages[page_name] = new MMB_Backbone['View_' + page_name];
                this.pages[page_name].render();
            }
        }
    },
    show_start_page: function(){
        if( ! MMB_Config){
            this.render('need_config');
        }else if( ! navigator.onLine){
            this.render('no_network');
        }else if( ! this.dropbox_ok){
            this.render('dropbox_sign_in');
        }else{
            this.render('register');
        }
    },
    provide_data_source: function(){
        $('.js-category').data('source', this.category);
        $('.js-account').data('source', this.get_accounts());
    },
    if_checked: function(db_value, field_value){
        if(db_value == field_value){
            return ' checked ';
        }else{
            return '';
        }
    },
    set_category: function(){
        if(this.category){
            return;
        }
        this.reset_category();
    },
    reset_category: function(){
        var category_depth = this.get_category_depth();
        if(category_depth == '1'){
            this.category = _.filter(MMB_Category[this.get_lang()], function(entry){
                return /.*:.*/.test(entry) == false;
            });
        }else{
            this.category = _.filter(MMB_Category[this.get_lang()], function(entry){
                return /.*:.*/.test(entry);
            });
        }
    },
    get_category_depth: function(){
        var category_depth = localStorage.getItem('category_depth');
        if(category_depth){
            return category_depth;
        }
        return '2';
    },
    get_accounts: function(){
        return ['My Wallet', '지갑'];
    }
};

MMB.initialize();