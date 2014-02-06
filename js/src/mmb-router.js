var MMB_Router = Backbone.Router.extend({

    routes: {
        "": 'start_page',
        "weekly(/:date)": 'weekly',
        "register": 'register',
        "setting": 'setting',
        "import": 'import',
        "category/list(/:behavior_type/*path)": 'category_list',
        "category/add/:behavior_type": 'category1_add',
        "category/add/:behavior_type/*path": 'category2_add',
        "category/update/:behavior_type/*path": 'category_update',
        "statistics/whole(/:year/:month)": 'statistics_whole',
        "account/list": "account_list",
        "account/add": "account_add",
        "account/update/*path": "account_update"

    },

    initialize: function(){

        MMB.set_polyglot();
        MMB.network_enabled = MMB.check_dropbox();
        Backbone.history.start();

        if(MMB.network_enabled){
            MMB.show_navbar();
            MMB.init_category_list();
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

    category_update: function(behavior_type, cat){

        var cats = cat.split(':');

        MMB.render('category_update', {
            behavior_type: behavior_type,
            cat1: cats[0],
            cat2: cats[1]
        });
    },

    statistics_whole: function(year, month){
        MMB.render('statistics', {
            key: 'whole_info',
            year: (year ? year : 'whole'),
            month: (month ? month : 'whole')
        });
    },

    account_list: function(){
        MMB.render('account_list');
    },

    account_add: function(){
        MMB.render('account_add');
    },

    account_update: function(account){
        MMB.render('account_update', {
            account: account
        });
    }

});