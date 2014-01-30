var MMB_Router = Backbone.Router.extend({

    routes: {
        "": 'start_page',
        "weekly(/:date)": 'weekly',
        "register": 'register',
        "setting": 'setting',
        "import": 'import',
        "category/list(/:behavior_type/*path)": 'category_list',
        "category/add/:behavior_type": 'category1_add',
        "category/add/:behavior_type/:parent": 'category2_add',
        "category/update/:behavior_type/:cat1": 'category_update',
        "category/update/:behavior_type/:cat1/:cat2": 'category_update',
        "category/delete/:behavior_type/:cat1/": 'category_delete',
        "category/delete/:behavior_type/:cat1/:cat2": 'category_delete'
    },

    initialize: function(){
        var network = false;

        MMB.set_polyglot();
        network = MMB.check_dropbox();
        Backbone.history.start();

        if(network){
            MMB.show_navbar();
            MMB.init_memo_data();
            MMB.set_category();
        }
    },

    start_page: function(){
        location.href = "#register";
    },

    weekly: function(date) {

        if(date === undefined || date === null){
            date = moment().format('YYYY-MM-DD');
        }

        MMB.render('weekly', {
            date: date
        });
    },

    register: function(){
        MMB.render('register');
    },

    setting: function(){
        MMB.render('setting');
    },

    import: function(){
        MMB.render('import');
    },

    category_list: function(behavior_type, level1){
        var opt = {
            behavior_type: behavior_type,
            level1: (level1 ? level1 : null)
        };
        MMB.render('category_list', opt);
    },

    category1_add: function(behavior_type){
        MMB.render('category_add', {
            cat_level: 1,
            title: polyglot.t(behavior_type) + ' ' + polyglot.t('Add Category'),
            behavior_type: behavior_type,
            parent: null
        });
    },

    category2_add: function(behavior_type, parent){
        MMB.render('category_add', {
            behavior_type: behavior_type,
            cat_level: 2,
            title: parent + ' ' + polyglot.t('Add Category'),
            parent: parent
        });
    },

    category_update: function(behavior_type, cat1, cat2){
        MMB.render('category_update', {
            behavior_type: behavior_type,
            cat1: cat1,
            cat2: cat2
        });
    },

    category_delete: function(behavior_type, cat1, cat2){
        MMB.render('category_delete', {
            behavior_type: behavior_type,
            cat1: cat1,
            cat2: cat2
        });
    }

});