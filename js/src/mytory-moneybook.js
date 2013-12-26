var polyglot = new Polyglot();

var MMBackbone = {
    RegisterView: Backbone.View.extend({
        render: function(){

        }
    })
};

var MMB = {
    initialize: function(){
        this.set_lang();
        this.show_navbar();
        this.show_start_page();
        this.fill_today();
        this.provide_data_source();
        this.bind_menu_event();
    },
    set_lang: function(){
        var user_lang = navigator.language || navigator.userLanguage,
            lang = 'en';

        user_lang = user_lang.substr(0, 2).toLowerCase();

        if(user_lang == 'ko'){
            lang = 'ko';
        }

        polyglot.extend(Lang[lang]);
    },
    pages: {
        'register': _.template($('#page-register').html()),
        'setting': _.template($('#page-setting').html())
    },
    show_navbar: function(){
        var navbar_template = _.template($('#navbar').html());
        $('#navbar-collapse').html(navbar_template());
    },
    show_page: function(page_name){
        $('.body').hide().html('').html(MMB.pages[page_name]()).fadeIn();
    },
    show_start_page: function(){
        this.show_page('register');
    },
    fill_today: function(){
        var date = new Date(),
            month = date.getMonth() + 1,
            date_string = date.getFullYear() + '-' + month + '-' + date.getDate();
        $('.js-today').val(date_string);
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