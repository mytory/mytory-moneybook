MMB_Backbone.View_transition = Backbone.View.extend({
    el: '.page-transition',
    template: null,
    render: function(opt){
        var item_list,
            year_list,
            vars,
            list = [],
            asset = 0,
            dept = 0,
            pure_asset = 0,
            account_list = MMB.datastore.account_list.query(),
            account_yearly_balance = [];

        if( ! opt.year){

            year_list = MMB.get_year_list();

            _.forEach(year_list, function(year){
                var asset_and_dept,
                    account_asset_and_dept = {};

                item_list = MMB.datastore.content.query({
                    year: year
                });

                asset_and_dept = MMB.get_asset_and_dept(item_list);
                asset += asset_and_dept.asset;
                dept += asset_and_dept.dept;
                pure_asset += asset_and_dept.pure_asset;

                list.push({
                    time: year,
                    asset: asset,
                    dept: dept,
                    pure_asset: pure_asset
                });
            });

            list = _.sortBy(list, function(entry){
                return -entry.time;
            });

            _.forEach(account_list, function(account){
                account_yearly_balance.push({
                    account_name: account.get('name'),
                    yearly_balance: MMB.get_account_yearly_balance(account.getId())
                });
            });

            // yearly
            vars = {
                year: null,
                account_yearly_balance: account_yearly_balance,
                list: list
            };

            MMB.util.render_ajax('pages/transition.html', vars, this, 'template');

        }else{

            // monthly

        }
    }
});