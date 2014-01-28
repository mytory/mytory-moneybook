var MMB_Router = Backbone.Router.extend({

    routes: {
        "": 'start_page',
        "weekly(/:date)": 'weekly',
        "register": 'register',
        "setting": 'setting',
        "import": 'import',
        "category/list(/*path)": 'category_list',
        "category/add/cat1/:behavior_type": 'add_cat1'
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

    category_list: function(level1){
        var opt = {};
        opt.level1 = (level1 ? level1 : null);
        MMB.render('category_list', opt);
    },

    add_cat1: function(behavior_type){
        MMB.render('category_add', {
            title: polyglot.t(behavior_type) + ' ' + polyglot.t('Add Category'),
            behavior_type: behavior_type
        });
    }

});