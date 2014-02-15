MMB_Backbone.View_search_query = Backbone.View.extend({
    el: '.page-search-query',
    template: null,
    events: {},
    render: function(opt){
        var item_list = MMB.datastore.content.query(),
            result = [],
            list,
            sum;

        _.forEach(item_list, function(item){
            if(item.get('memo').indexOf(opt.query) !== -1){
                result.push(item);
            }
        });

        // order by desc
        result = _.sortBy(result, function(item){
            return MMB.get_date(item);
        });
        result.reverse();

        list = MMB.get_item_set_list(result);
        sum = MMB.get_withwrawal_sum(result);

        MMB.util.render_ajax("pages/search-query.html", {
            list: list,
            sum: sum
        }, this, "template");
    },
    search_query: function(e){
        e.preventDefault();
        location.href = '#search/query/' + this.$el.find('#query').val();
    }
})
