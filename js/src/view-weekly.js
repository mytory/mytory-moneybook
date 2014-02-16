MMB_Backbone.View_weekly = Backbone.View.extend({
    el: ".page-weekly",
    events: {
        "click .js-weekly-change-date": "change_date",
        "click .js-weekly-change-days-btn": "change_days"
    },
    change_date: function(){
        location.href = '#weekly/' + $('.js-weekly-basic-date').val();
    },
    change_days: function(e){
        var current = $('.js-weekly-basic-date').val(),
            days = $(e.target).data('days'),
            target_date = moment(current, 'YYYY-MM-DD').add('days', days).format('YYYY-MM-DD');

        location.href = '#weekly/' + target_date;
    },
    template: null,
    render: function(opts){
        var that = this,
            i,
            week_data = [],
            list = [],
            date,
            result,
            item_set,
            day_of_the_week,
            sum;

        if(opts === undefined || opts.date === undefined){
            opts = {
                date: moment().format('YYYY-MM-DD')
            }
        }

        if( ! MMB.datastore.content){
            setTimeout(function(){
                that.render(opts);
            }, 500);
        }else{
            for(i = 0; i < 7; i++){
                var query_opt = {
                    year: moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('YYYY'),
                    month: moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('MM'),
                    day: moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('DD')
                };
                result = MMB.datastore.content.query(query_opt);

                date = moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('YYYY-MM-DD');
                day_of_the_week = moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('dd');
                sum = 0;

                list = MMB.get_item_set_list(result);
                sum = MMB.get_withdrawal_sum(result);

                week_data.push({
                    date: date,
                    day_of_the_week: day_of_the_week,
                    list: list,
                    sum: sum
                });
                list = [];
            }

            vars = {
                week_data: week_data
            };

            MMB.util.render_ajax('pages/weekly.html', vars, this, 'template');

            return this;
        }

    }
});