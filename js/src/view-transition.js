MMB_Backbone.View_transition = Backbone.View.extend({
    el: '.body',
    template: null,
    render: function(opt){
        var item_list,
            year_list,
            vars,
            list = [];

        if( ! opt.year){

            year_list = MMB.get_year_list();

            _.forEach(year_list, function(year){
                item_list = MMB.datastore.content.query({
                    year: year
                });
                list.push({
                    time: year,
                    amount: MMB.get_balance(item_list)
                });
            });

            // yearly
            vars = {
                prev: null,
                next: null,
                year: null,
                current_year: moment().format('YYYY'),
                list: list
            };

            MMB.util.render_ajax('pages/transition.html', vars, this, 'template');

        }else{

        }
    }
});