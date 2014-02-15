MMB_Backbone.View_transition = Backbone.View.extend({
    el: '.page-transition',
    template: null,
    render: function(opt){
        var item_list,
            year_list,
            vars,
            list = [],
            statistics;

        if( ! opt.year){

            year_list = MMB.get_year_list();

            _.forEach(year_list, function(year){
                item_list = MMB.datastore.content.query({
                    year: year
                });
                statistics = MMB.get_statistics(item_list);
                list.push({
                    time: year,
                    withdrawal: statistics.withdrawal,
                    withdrawal_like_transfer: statistics.withdrawal_like_transfer,
                    withdrawal_like: statistics.withdrawal + statistics.withdrawal_like_transfer,
                    deposit: statistics.deposit,
                    deposit_like_transfer: statistics.deposit_like_transfer,
                    deposit_like: statistics.deposit + statistics.deposit_like_transfer,
                    balance: MMB.get_balance(item_list)
                });
            });

            list = _.sortBy(list, function(entry){
                return -entry.time;
            });

            // yearly
            vars = {
                year: opt.year,
                list: list
            };

            MMB.util.render_ajax('pages/transition.html', vars, this, 'template');

        }else{

        }
    }
});