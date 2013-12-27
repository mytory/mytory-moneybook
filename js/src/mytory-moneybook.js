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
                vars;
            vars = {
                today: today
            };
            $('.body').hide().html(this.template(vars)).fadeIn();
        }
    }),
    View_setting: Backbone.View.extend({
        template: _.template($('#page-setting').html()),
        render: function(){
            var vars;
            vars = {};
            $('.body').hide().html('').html(this.template(vars)).fadeIn();
        }
    })
};

var MMB = {
    initialize: function(){
        this.set_lang();
        this.show_navbar();
        this.show_start_page();
        this.provide_data_source();
        this.bind_menu_event();
    },
    view_register: new MMB_Backbone.View_register(),
    view_setting: new MMB_Backbone.View_setting(),
    view_navbar: new MMB_Backbone.View_navbar(),
    set_lang: function(){
        var user_lang = navigator.language || navigator.userLanguage,
            lang = 'en';

        user_lang = user_lang.substr(0, 2).toLowerCase();

        if(user_lang == 'ko'){
            lang = 'ko';
        }

        polyglot.extend(Lang[lang]);
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
        $('.js-category').data('source', ['Food:Dining', 'Food:Morning']);
        $('.js-account').data('source', ['My Wallet', 'Hana Bank']);
    },
    bind_menu_event: function(){
        var that = this;
        $('[data-page]').click(function(e){
            e.preventDefault();
            var page_name = $(this).data('page');
            that.show_page(page_name);
        });
    }
};

MMB.initialize();