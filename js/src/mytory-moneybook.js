var MMB = {
    initialize: function(){
        this.show_start_page();
        this.fill_today();
        this.provide_data_source();
        this.bind_menu_event();
    },
    show_start_page: function(){
        $('.page-register').show();
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
        $('[role=menuitem]').click(function(e){
            e.preventDefault();
            var page_name = $(this).data('page');
            $('[role=page]').hide();
            $('.page-' + page_name).fadeIn();
        });
    }
};

MMB.initialize();
