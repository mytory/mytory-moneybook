MMB_Backbone.View_search = Backbone.View.extend({
    el: '.page-search',
    template: null,
    events: {
        "submit .js-search-query-form": "search_query"
    },
    search_query: function(e){
        e.preventDefault();
        location.href = '#search/' + this.$el.find('#query').val();
    },
    render: function(opt){
        var item_list = MMB.datastore.content.query(),
            result = [],
            list,
            sum;

        if(opt.query){
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
            sum = MMB.get_withdrawal_sum(result);

            MMB.util.render_ajax("pages/search.html", {
                list: list,
                sum: sum,
                query: opt.query
            }, this, "template");
        }else{
            MMB.util.render_ajax("pages/search.html", {
                list: null,
                sum: null,
                query: ''
            }, this, "template");
        }
    }
})
