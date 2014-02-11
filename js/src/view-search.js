MMB_Backbone.View_search_form = Backbone.View.extend({
    el: '.page-search-form',
    template: null,
    events: {
        "submit .js-search-query-form": "search_query"
    },
    render: function(){
        MMB.util.render_ajax("pages/search-form.html", {}, this, "template");
    },
    search_query: function(e){
        e.preventDefault();
        location.href = '#search/query/' + this.$el.find('#query').val();
    }
})
