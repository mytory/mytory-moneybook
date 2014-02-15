MMB_Backbone.View_export = Backbone.View.extend({
    el: '.page-export',
    template: null,
    render: function(){
        var item_list = MMB.datastore.content.query(),
            list = [],
            item_set,
            category;

        _.forEach(item_list, function(item){
            item_set = {
                date: MMB.get_date(item),
                behavior_type: polyglot.t(item.get('behavior_type')),
                memo: item.get('memo'),
                amount: item.get('amount'),
                category: '',
                account: MMB.datastore.account_list.get(item.get('account_id')).get('name'),
                to_account: ''
            };
            if(item.get('cat_id')){
                category = MMB.datastore.category_list.get(item.get('cat_id'));
                item_set.category = category.get('cat1') + ':' + category.get('cat2');
            }
            if(item.get('to_account_id')){
                item_set.to_account = MMB.datastore.account_list.get(item.get('to_account_id')).get('name');
            }
            list.push(item_set);
        });

        list = _.sortBy(list, function(item_set){
            return item_set.date;
        });

        MMB.util.render_ajax("pages/export.html", {
            list: list
        }, this, "template");
    }
});
