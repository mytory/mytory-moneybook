var MMB_Router = Backbone.Router.extend({

    routes: {
        "": 'start_page',
        "weekly(/:date)": 'weekly',
        "register": 'register',
        "setting": 'setting',
        "import": 'import',
        "category/list(/:behavior_type/*path)": 'category_list',
        "category/add/:behavior_type": 'add_cat1',
        "category/add/:behavior_type/:parent": 'add_cat2',
        "category/update/:behavior_type/:cat1": 'update_cat',
        "category/update/:behavior_type/:cat1/:cat2": 'update_cat',
        "category/delete/:behavior_type/:cat1/": 'delete_cat',
        "category/delete/:behavior_type/:cat1/:cat2": 'delete_cat'
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

    add_cat1: function(behavior_type){
        MMB.render('category_add', {
            cat_level: 1,
            title: polyglot.t(behavior_type) + ' ' + polyglot.t('Add Category'),
            behavior_type: behavior_type,
            parent: null
        });
    },

    add_cat2: function(behavior_type, parent){
        MMB.render('category_add', {
            behavior_type: behavior_type,
            cat_level: 2,
            title: parent + ' ' + polyglot.t('Add Category'),
            parent: parent
        });
    }

});