MMB_Backbone.View_transition = Backbone.View.extend({
    el: '.page-transition',
    template: null,
    render: function(opt){
        var item_list,
            year_list,
            vars,
            list = [],
            mine = 0,
            others = 0,
            pure_asset = 0;

        if( ! opt.year){

            year_list = MMB.get_year_list();

            _.forEach(year_list, function(year){
                var mine_and_others,
                    balance;

                item_list = MMB.datastore.content.query({
                    year: year
                });
                mine_and_others = MMB.get_mine_and_others(item_list);
                mine += mine_and_others.mine;
                others += mine_and_others.others;
                pure_asset += mine_and_others.pure_asset;
                list.push({
                    time: year,
                    mine: mine,
                    others: others,
                    pure_asset: pure_asset
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