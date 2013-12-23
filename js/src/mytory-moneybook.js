var MMB = {
    initialize: function(){
        this.fill_today();
    },
    fill_today: function(){
        var date = new Date(),
            month = date.getMonth() + 1,
            date_string = date.getFullYear() + '-' + month + '-' + date.getDate();
        $('.js-today').val(date_string);
    }
};

MMB.initialize();
