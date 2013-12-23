var MMB = {
    initialize: function(){
        this.fill_today();
        this.provide_data_source();
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
    }
};

MMB.initialize();
