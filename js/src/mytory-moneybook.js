var polyglot = new Polyglot();

var MMB_Backbone = {
    View_navbar: Backbone.View.extend({
        template: _.template($('#navbar').html()),
        render: function(){
            $('#navbar-collapse').html(this.template());
        }
    }),
    View_register: Backbone.View.extend({
        template: _.template($('#page-register').html()),
        render: function(){
            var date = new Date(),
                month = date.getMonth() + 1,
                today = date.getFullYear() + '-' + month + '-' + date.getDate(),
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
        },
        save_setting: function(){
            var setting = {},
                value_obj = $('.js-form-setting').serializeArray();
            _.each(value_obj, function(obj){
                localStorage[obj.name] = obj.value;
            });
            MMB.reset_category();
        }
    })
};

var MMB = {
    initialize: function(){
        this.set_polyglot();
        this.set_category();
        this.show_navbar();
        this.show_start_page();
        this.provide_data_source();
        this.bind_menu_event();
    },
    category: null,
    lang: null,
    view_register: new MMB_Backbone.View_register(),
    view_setting: new MMB_Backbone.View_setting(),
    view_navbar: new MMB_Backbone.View_navbar(),
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
        this.view_navbar.render();
    },
    show_page: function(page_name){
        this['view_' + page_name].render();
    },
    show_start_page: function(){
        this.show_page('register');
    },
    provide_data_source: function(){
        $('.js-category').data('source', this.category);
        $('.js-account').data('source', this.get_accounts());
    },
    bind_menu_event: function(){
        var that = this;
        $('[data-page]').click(function(e){
            e.preventDefault();
            var page_name = $(this).data('page');
            that.show_page(page_name);
        });
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