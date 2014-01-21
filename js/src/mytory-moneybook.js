var polyglot = new Polyglot();

var MMB_Router = Backbone.Router.extend({

    routes: {
        "": 'weekly',
        "weekly(/:date)": 'weekly',
        "register": 'register',
        "setting": 'setting',
        "import": 'import'
    },

    initialize: function(){
        var network = false;
        MMB.set_polyglot();
        MMB.set_category();
        network = MMB.check_dropbox();
        Backbone.history.start();

        if(network){
            MMB.show_navbar();
            MMB.provide_data_source();
        }
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
    }

});

var MMB_Backbone = {

    View_navbar: Backbone.View.extend({
        el: '#navbar-collapse',
        template: _.template($('#navbar').html()),
        events: {
            "click .js-sign-out": "sign_out"
        },
        sign_out: function(e){
            e.preventDefault();
            if(MMB.dropbox_ok){
                MMB.dropbox_client.signOut();
                MMB.dropbox_ok = false;
            }
            MMB.render('dropbox_sign_in');
            return this;
        },
        render: function(){
            $('#navbar-collapse').html(this.template());
            return this;
        }
    }),

    View_need_config: Backbone.View.extend({
        template: _.template($('#page-need-config').html()),
        render: function(){
            $('.body').html(this.template());
            return this;
        }
    }),

    View_no_network: Backbone.View.extend({
        template: _.template($('#page-no-network').html()),
        render: function(){
            $('.body').html(this.template());
            return this;
        }
    }),

    View_dropbox_sign_in: Backbone.View.extend({
        el: ".body",
        template: _.template($('#page-dropbox-sign-in').html()),
        events: {
            "click .js-dropbox-sign-in": "dropbox_sign_in"
        },
        dropbox_sign_in: function(){
            MMB.dropbox_client = new Dropbox.Client({key: MMB_Config.app_key});

            // Try to finish OAuth authorization.
            MMB.dropbox_client.authenticate({interactive: true}, function (error) {
                if (error) {
                    alert('Authentication error: ' + error);
                }
            });
            return this;
        },
        render: function(){
            $('.body').html(this.template());
            return this;
        }
    }),

    View_register: Backbone.View.extend({
        el: '.body',
        template: _.template($('#page-register').html()),
        render: function(){
            var today = moment().format('YYYY-MM-DD'),
                vars,
                category_placeholder,
                tmp;

            tmp = _.random(0, MMB.category.length - 1);

            category_placeholder = MMB.category[tmp];

            vars = {
                today: today,
                category_placeholder: category_placeholder
            };
            $('.body').hide().html(this.template(vars)).fadeIn();
            return this;
        },
        events: {
            "submit .js-register-form": "register",
            "click [name=behavior_type]": "toggle_transfer_item"
        },
        register: function(e){
            e.preventDefault();
            var data_arr = $('.js-register-form').serializeArray(),
                data = {},
                inserted = [];
            _.forEach(data_arr, function(entry){
                data[entry.name] = entry.value;
            });

            data.year = data.date.substr(0, 4);
            data.month = data.date.substr(5, 2);
            data.day = data.date.substr(8, 2);
            data.cat1 = data.category.split(':')[0];
            data.cat2 = data.category.split(':')[1] ? data.category.split(':')[1] : '';

            delete data.category;
            delete data.date;

            // dropbox query
            inserted.push(MMB.register(data));

            return this;
        },
        toggle_transfer_item: function(e){
            if($(e.target).val() === 'transfer'){
                $('.js-transfer-item').find('input').prop('disabled', false);
                $('.js-transfer-item').fadeIn();
            }else{
                $('.js-transfer-item').find('input').prop('disabled', true);
                $('.js-transfer-item').fadeOut();
            }
        }
    }),

    View_setting: Backbone.View.extend({
        el: ".body",
        template: _.template($('#page-setting').html()),
        events: {
            "click input" : "save_setting",
            "blur" : "save_setting",
            "click .js-delete-all-data": "delete_all_data"
        },
        render: function(){
            var vars;
            vars = {
                language: MMB.get_lang(),
                category_depth: MMB.get_category_depth()
            };
            $('.body').hide().html(this.template(vars)).fadeIn();
            return this;
        },
        save_setting: function(){
            var setting = {},
                value_obj = $('.js-form-setting').serializeArray();
            _.each(value_obj, function(obj){
                MMB.set_setting(obj.name, obj.value);
            });
            MMB.reset_category();
            return this;
        },
        delete_all_data: function(){
            if(confirm(polyglot.t("Really? You can't restore data."))){
                var all_data = MMB.datastore.content.query();
                _.forEach(all_data, function(record){
                    record.deleteRecord();
                });

                all_data = MMB.datastore.etc.query();
                _.forEach(all_data, function(record){
                    record.deleteRecord();
                });
                alert(polyglot.t("All data deleted."));
            }
        }
    }),

    View_import: Backbone.View.extend({
        el: ".body",
        template: _.template($('#page-import').html()),
        render: function(){
            var vars = {};
            $('.body').hide().html(this.template(vars)).fadeIn();
            return this;
        },
        events: {
            "dragenter .xls-drop-area": "drag_handle",
            "dragover .xls-drop-area": "drag_handle",
            "dragleave .xls-drop-area": "drag_leave",
            "drop .xls-drop-area": "drop_process"
        },
        drag_leave: function(e){
            $(e.target).removeClass('dragging');
        },
        xlsworker: function (data, cb) {
            var worker = new Worker('js/xlsworker.js');
            worker.onmessage = function(e) {
                switch(e.data.t) {
                    case 'ready': break;
                    case 'e': console.error(e.data.d);
                    case 'xls': cb(e.data.d); break;
                }
            };
            worker.postMessage(data);
        },
        drop_process: function(e){
            $(e.target).removeClass('dragging');
            var that = this,
                files,
                i,
                f;
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            
            files = e.originalEvent.dataTransfer.files;
            for (i = 0, f = files[i]; i != files.length; ++i) {
                var reader = new FileReader();
                var name = f.name;
                reader.onload = function(e) {
                    var data = e.target.result;
                    if(typeof Worker !== 'undefined') {
                        that.xlsworker(data, that.process_wb);
                    } else {
                        var cfb = XLS.CFB.read(data, {type: 'binary'});
                        //var arr = String.fromCharCode.apply(null, new Uint8Array(data));
                        //var cfb = XLS.CFB.read(btoa(arr), {type: 'base64'});
                        var wb = XLS.parse_xlscfb(cfb);
                        that.process_wb(wb);
                    }
                };
                reader.readAsBinaryString(f);
                //reader.readAsArrayBuffer(f);
            }
        },
        process_wb: function (wb) {
            var that = MMB.pages.import;
            var output = that.to_csv(wb),
                rows;

            rows = output.split('\n');

            if(rows[2].trim() == '"지출 현황"'){
                that.import_naver_withdrawal(rows);
            }else if(rows[2].trim() == '"수입 현황"'){
                that.import_naver_deposit(rows);
            }else{
                alert("네이버에서 다운받은 엑셀이 아닌 것 같습니다.");
            }
        },
        import_naver_withdrawal: function (rows){
            var sheet1 = [],
                sheet2 = [],
                data = [],
                inserted = [];

            _.forEach(rows, function(row){
                if(/[0-9]{4}년[0-9]{1,2}월[0-9]{1,2}일/.test(row)){
                    sheet1.push(row.replace(/"/g, '').split('\t'));
                }
            });

            _.forEach(sheet1, function(row){
                if(row[3] !== '' && /[0-9]+/.test(row[3].replace(/,/g, ''))){
                    sheet2.push(row);
                }
            });

            _.forEach(sheet2, function(row){
                if(/이체\/대체>/.test(row[7])){
                    return true;
                }
                data.push({
                    behavior_type: 'withdrawal',
                    memo: row[2],
                    amount: parseInt(row[3].replace(/,/g, '')) + parseInt(row[4].replace(/,/g, '')),
                    account: (row[5] == '' ? '내 지갑' : row[5]),
                    cat1: row[7].split('>')[0],
                    cat2: row[7].split('>')[1] ? row[7].split('>')[1] : '',
                    year: row[0].substr(0, 4),
                    month: row[0].substr(5, 2),
                    day: row[0].substr(8, 2)
                });
            });

            _.forEach(data, function(row){
                inserted.push(MMB.register(row));
            });

            return this;
        },
        import_naver_deposit: function (rows){

        },
        drag_handle: function(e) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'copy';
            $(e.target).addClass('dragging');
        },
        to_json: function (workbook){
            var result = {};
            workbook.SheetNames.forEach(function(sheetName) {
                var roa = XLS.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                if(roa.length > 0){
                    result[sheetName] = roa;
                }
            });
            return result;
        },
        to_csv: function (workbook) {
            var result = [];
            workbook.SheetNames.forEach(function(sheetName) {
                var csv = XLS.utils.make_csv(workbook.Sheets[sheetName]);
                if(csv.length > 0){
                    result.push("SHEET: " + sheetName);
                    result.push("");
                    result.push(csv);
                }
            });
            return result.join("\n");
        }
    }),

    View_weekly: Backbone.View.extend({
        el: ".body",
        events: {
            "click .js-weekly-change-date": "change_date",
            "click .js-weekly-change-days-btn": "change_days"
        },
        change_date: function(){
            MMB.router.navigate('weekly/' + $('.js-weekly-basic-date').val(), {trigger: true})
        },
        change_days: function(e){
            var current = $('.js-weekly-basic-date').val(),
                days = $(e.target).data('days'),
                target_date = moment(current, 'YYYY-MM-DD').add('days', days).format('YYYY-MM-DD');

            MMB.router.navigate('weekly/' + target_date, {trigger: true})
        },
        template: _.template($('#page-weekly').html()),
        render: function(opts){
            var that = this,
                i,
                week_data = [],
                list,
                date,
                day_of_the_week,
                sum = {};

            if(opts === undefined || opts.date === undefined){
                opts = {
                    date: moment().format('YYYY-MM-DD')
                }
            }

            if( ! MMB.datastore.content){
                setTimeout(function(){
                    that.render(opts);
                }, 500);
            }else{
                for(i = 0; i < 7; i++){
                    var query_opt = {
                        year: moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('YYYY'),
                        month: moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('MM'),
                        day: moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('DD')
                    };
                    list = MMB.datastore.content.query(query_opt);

                    date = moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('YYYY-MM-DD');
                    day_of_the_week = moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('dd');
                    sum[date] = 0;

                    _.forEach(list, function(record){
                        sum[date] += record.get('amount');
                    });

                    week_data.push({
                        date: date,
                        day_of_the_week: day_of_the_week,
                        list: list,
                        sum: sum
                    });
                }

                vars = {
                    week_data: week_data
                };
                $('.body').hide().html(this.template(vars)).fadeIn();

                return this;
            }

        }
    })
};

var MMB = {
    pages: {},
    category: null,
    lang: null,
    dropbox_client: null,
    dropbox_ok: false,
    moneybook: null,
    datastore: {
        content: null,
        etc: null
    },
    router: null,
    check_dropbox: function(){
        try{
            this.dropbox_client = new Dropbox.Client({key: MMB_Config.app_key});

            // Try to finish OAuth authorization.
            this.dropbox_client.authenticate({interactive: false}, function (error) {
                if (error) {
                    alert(polyglot.t('Authentication error: ') + error);
                }
            });

            if(this.dropbox_client.isAuthenticated()){
                this.dropbox_ok = true;
                // get datastore api
                datastoreManager = MMB.dropbox_client.getDatastoreManager();

                datastoreManager.openDefaultDatastore(function (error, datastore) {
                    if (error) {
                        alert('Error opening default datastore: ' + error);
                    }

                    MMB.datastore.content = datastore.getTable('moneybook_content');
                    MMB.datastore.etc = datastore.getTable('moneybook_etc');
                });
                return true;

            }else{
                this.render('dropbox_sign_in');
                return false;
            }


        }catch(e){
            this.render('no_network');
            return false;
        }
    },
    set_polyglot: function(){
        polyglot.extend(Lang[this.get_lang()]);
    },
    set_setting: function(item_name, value){
        localStorage["setting_" + item_name] = value;
    },
    get_setting: function(item_name){
        return localStorage.getItem('setting_' + item_name);
    },
    get_lang: function(){

        if(this.lang){
            return this.lang;
        }

        var user_lang = navigator.language || navigator.userLanguage,
            lang = this.get_setting('language');

        if(lang == null){
            user_lang = user_lang.substr(0, 2).toLowerCase();

            if(user_lang == 'ko'){
                lang = 'ko';
            }else{
                lang = 'en';
            }
        }

        this.lang = lang;

        return lang;
    },
    show_navbar: function(){
        this.render('navbar');
    },
    render: function(page_name, vars){
        if(
            MMB_Config && this.dropbox_ok ||
                page_name == 'need_config' ||
                page_name == 'dropbox_sign_in' ||
                page_name == 'no_network'
        ){
            if(this.pages[page_name]){
                this.pages[page_name].render(vars);
            }else{
                this.pages[page_name] = new MMB_Backbone['View_' + page_name];
                this.pages[page_name].render(vars);
            }
        }
    },
    show_start_page: function(){
        if( ! MMB_Config){
            this.render('need_config');
        }else if( ! navigator.onLine){
            this.render('no_network');
        }else if( ! this.dropbox_ok){
            this.render('dropbox_sign_in');
        }else{
            this.render('weekly');
        }
    },
    provide_data_source: function(){
        $('.js-category').data('source', this.category);
        $('.js-account').data('source', this.get_accounts());
    },
    if_checked: function(db_value, field_value){
        if(db_value == field_value){
            return ' checked ';
        }else{
            return '';
        }
    },
    set_category: function(){
        if(this.category){
            return;
        }
        this.reset_category();
    },
    reset_category: function(){
        var category_depth = this.get_category_depth();
        if(category_depth == '1'){
            this.category = _.filter(MMB_Category[this.get_lang()], function(entry){
                return /.*:.*/.test(entry) == false;
            });
        }else{
            this.category = _.filter(MMB_Category[this.get_lang()], function(entry){
                return /.*:.*/.test(entry);
            });
        }
    },
    get_category_depth: function(){
        var category_depth = localStorage.getItem('category_depth');
        if(category_depth){
            return category_depth;
        }
        return '2';
    },
    get_accounts: function(){
        return JSON.parse(localStorage['account']);
    },
    register: function(data){

        this.update_account_list(data.account);
        if(data.to_account){
            this.update_account_list(data.to_account);
        }

        this.update_account_info(data);

        MMB.datastore.etc.insert();

        return MMB.datastore.content.insert(data);
    },

    update_account_list: function(account_name){
        var account_record, account, account_string;

        account_record = MMB.datastore.etc.query({key: 'account'})[0];

        if( ! account_record){
            account = [];
        }else{
            account = JSON.parse(account_record.get('value'));
        }

        if(_.indexOf(account, account_name) === -1){
            account.push(account_name);
            account_string = JSON.stringify(account);
            localStorage['account'] = account_string;
            if(account_record){
                account_record.update({
                    value: account_string
                });
            }else{
                MMB.datastore.etc.insert({
                    key: 'account',
                    value: account_string
                });
            }
        }
    },

    update_account_info: function(data){

        var account_info, new_amount;

        if(data.behavior_type === 'withdrawal' || data.behavior_type === 'transfer'){
            data.amount = data.amount * -1;
        }

        account_info = this.datastore.etc.query({
            key: 'account_info',
            account_name: data.account
        })[0];

        if( ! account_info){
            account_info = this.datastore.etc.insert({
                key: 'account_info',
                account_name: data.account,
                amount: 0
            });
        }

        new_amount = parseFloat(account_info.get('amount')) + parseFloat(data.amount);

        account_info.update({
            amount: new_amount
        });

        if(data.behavior_type === 'transfer'){
            account_info = this.datastore.etc.query({
                key: 'account_info',
                account_name: data.to_account
            })[0];

            if( ! account_info){
                account_info = this.datastore.etc.insert({
                    key: 'account_info',
                    account_name: data.to_account,
                    amount: 0
                });
            }

            new_amount = parseFloat(account_info.get('amount')) + parseFloat( data.amount * -1 );

            account_info.update({
                amount: new_amount
            });
        }

        return this;
    }


};

MMB.util = {
    number_format: function (number, decimals, dec_point, thousands_sep) {
        // From: http://phpjs.org/functions
        // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +     bugfixed by: Michael White (http://getsprink.com)
        // +     bugfixed by: Benjamin Lupton
        // +     bugfixed by: Allan Jensen (http://www.winternet.no)
        // +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
        // +     bugfixed by: Howard Yeend
        // +    revised by: Luke Smith (http://lucassmith.name)
        // +     bugfixed by: Diogo Resende
        // +     bugfixed by: Rival
        // +      input by: Kheang Hok Chin (http://www.distantia.ca/)
        // +   improved by: davook
        // +   improved by: Brett Zamir (http://brett-zamir.me)
        // +      input by: Jay Klehr
        // +   improved by: Brett Zamir (http://brett-zamir.me)
        // +      input by: Amir Habibi (http://www.residence-mixte.com/)
        // +     bugfixed by: Brett Zamir (http://brett-zamir.me)
        // +   improved by: Theriault
        // +      input by: Amirouche
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // *     example 1: number_format(1234.56);
        // *     returns 1: '1,235'
        // *     example 2: number_format(1234.56, 2, ',', ' ');
        // *     returns 2: '1 234,56'
        // *     example 3: number_format(1234.5678, 2, '.', '');
        // *     returns 3: '1234.57'
        // *     example 4: number_format(67, 2, ',', '.');
        // *     returns 4: '67,00'
        // *     example 5: number_format(1000);
        // *     returns 5: '1,000'
        // *     example 6: number_format(67.311, 2);
        // *     returns 6: '67.31'
        // *     example 7: number_format(1000.55, 1);
        // *     returns 7: '1,000.6'
        // *     example 8: number_format(67000, 5, ',', '.');
        // *     returns 8: '67.000,00000'
        // *     example 9: number_format(0.9, 0);
        // *     returns 9: '1'
        // *    example 10: number_format('1.20', 2);
        // *    returns 10: '1.20'
        // *    example 11: number_format('1.20', 4);
        // *    returns 11: '1.2000'
        // *    example 12: number_format('1.2000', 3);
        // *    returns 12: '1.200'
        // *    example 13: number_format('1 000,50', 2, '.', ' ');
        // *    returns 13: '100 050.00'
        // Strip all characters but numerical ones.
        number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
        var n = !isFinite(+number) ? 0 : +number,
            prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
            sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
            dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
            s = '',
            toFixedFix = function(n, prec) {
                var k = Math.pow(10, prec);
                return '' + Math.round(n * k) / k;
            };
        // Fix for IE parseFloat(0.55).toFixed(0) = 0;
        s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
        if (s[0].length > 3) {
            s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
        }
        if ((s[1] || '').length < prec) {
            s[1] = s[1] || '';
            s[1] += new Array(prec - s[1].length + 1).join('0');
        }
        return s.join(dec);
    }
}

MMB.router = new MMB_Router();