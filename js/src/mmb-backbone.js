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
            $('.js-navbar').html(this.template());
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
        template: null,
        template_candidate: _.template($('#template-auto-complete-candidate').html()),
        just_date: null,
        events: {
            "submit .js-register-form": "register",
            "click .js-behavior-type-box": "toggle_transfer_item",
            "blur #date": "set_just_date",

            "keyup .js-auto-complete": "auto_complete_memo_related",
            "focus .js-auto-complete": "auto_complete_memo_related",
            "keyup .js-filter-candidates": "filter_candidates",
            "click .js-auto-complete-candidate": "select_candidate",

            "click .js-delete-item": "delete_item"
        },
        render: function(opts){
            var that = this,
                date,
                vars,
                category_list = MMB.datastore.category_list.query(),
                category_placeholder,
                tmp,
                item;


            tmp = _.random(0, category_list.length - 1);

            if(tmp){
                category_placeholder = category_list[tmp].get('cat1') + ":" + category_list[tmp].get('cat2');
            }

            item = _.clone(MMB.mock);
            if(opts.id){
                item = this.get_item_for_form(opts.id);
            }

            if(item.get('date')){
                date = item.get('date');
            }else if(this.just_date){
                date = this.just_date;
            }else{
                date = moment().format('YYYY-MM-DD');
            }

            vars = {
                date: date,
                category_placeholder: category_placeholder,
                item: item
            };

            MMB.util.render_ajax('pages/register.html', vars, this, 'template', function(){
                that.toggle_transfer_item();
            });

            return this;
        },
        get_item_for_form: function(id){
            var item,
                item_original,
                category,
                account,
                to_account;

            item_original = MMB.datastore.content.get(id);
            account = MMB.datastore.account_list.get(item_original.get('account_id'));

            item = {
                behavior_type: item_original.get('behavior_type'),
                memo: item_original.get('memo'),
                date: item_original.get('year') + '-' + item_original.get('month') + '-' + item_original.get('day'),
                amount: item_original.get('amount'),
                account: account.get('name'),
                get: function(name){
                    if(this[name]){
                        return this[name];
                    }else{
                        return null;
                    }
                },
                getId: function(){
                    return item_original.getId();
                }
            }

            if(item_original.get('to_account_id')){

                // transfer
                to_account = MMB.datastore.account_list.get(item_original.get('to_account_id'));

                item.to_account = to_account.get('name');
            }else{

                // not transfer
                category = MMB.datastore.category_list.get(item_original.get('cat_id'));
                item.category = category.get('cat1') + ':' + category.get('cat2');
            }

            return item;

        },
        register: function(e){
            e.preventDefault();

            var date,
                item,
                data = MMB.util.form2json('.js-register-form');

            if(data.category && data.category.split(':').length < 2){
                alert(polyglot.t('Enter category to two level using colon(:).'));
                return false;
            }else if(data.category && data.category.split(':').length > 2){
                alert(polyglot.t('Category level can be only 2. And you cannot use colon(:) on category name.'));
                return false;
            }

            data.year = data.date.substr(0, 4);
            data.month = data.date.substr(5, 2);
            data.day = data.date.substr(8, 2);

            if(data.category){
                data.cat1 = data.category.split(':')[0];
                data.cat2 = data.category.split(':')[1] ? data.category.split(':')[1] : '';
                delete data.category;
            }
            delete data.date;

            item = MMB.register(data);

            if( ! data.id){

                // reset form after register.
                window.scrollTo(0,0);
                $('.js-alert').fadeIn();
                setTimeout(function(){
                    $('.js-alert').fadeOut();
                }, 5000);
                $('.js-register-form')[0].reset();
                if(this.just_date){
                    date = this.just_date;
                }else{
                    date = moment().format('YYYY-MM-DD');
                }
                $('#date').val(date);
                return this;

            }else{
                location.href = '#weekly/' + item.get('year') + '-' + item.get('month') + '-' + item.get('day');
            }
        },
        toggle_transfer_item: function(e){
            var value = $('[name="behavior_type"]:checked').val();
            if(value === 'transfer'){
                $('.js-transfer-item').find('input').prop('disabled', false);
                $('.js-transfer-item').fadeIn();
                $('.js-no-transfer-item').find('input').prop('disabled', true);
                $('.js-no-transfer-item').fadeOut();
            }else{
                $('.js-transfer-item').find('input').prop('disabled', true);
                $('.js-transfer-item').fadeOut();
                $('.js-no-transfer-item').find('input').prop('disabled', false);
                $('.js-no-transfer-item').fadeIn();
            }
        },
        auto_complete_memo_related: function(e){
            var amount_list,
                memo_list = [],
                vars,
                memo = $.trim($('#memo').val()),
                memo_all = MMB.datastore.auto_complete.query({
                    key: 'memo'
                }),
                pattern = new RegExp(memo),
                behavior_type = $('[name="behavior_type"]:checked').val();

            if( ! memo){
                return false;
            }

            this.show_auto_complete_box(e.target);

            if( ! memo){
                return false;
            }

            // set memo
            _.forEach(memo_all, function(entry){
                if(pattern.test(entry.get('value'))){
                    memo_list.push(entry);
                }
            });

            memo_list = _.sortBy(memo_list, function(entry){
                return entry.get('count') * -1;
            });

            vars = {
                candidate_list: memo_list
            }

            $('.auto-complete-box[data-key="memo"]').html(this.template_candidate(vars));


            // set amount
            amount_list = MMB.datastore.auto_complete.query({
                key: 'amount',
                memo: memo
            });

            amount_list = _.sortBy(amount_list, function(entry){
                return entry.get('count') * -1;
            });

            vars = {
                candidate_list: amount_list
            }

            $('.auto-complete-box[data-key="amount"]').html(this.template_candidate(vars));

            if(behavior_type !== 'transfer'){

                // set category
                vars = {
                    candidate_list: this.get_auto_complete_memo_related(memo, 'category', behavior_type)
                }
                $('.auto-complete-box[data-key="category"]').html(this.template_candidate(vars));
            }else{

                // set to_account
                vars = {
                    candidate_list: this.get_auto_complete_memo_related(memo, 'to_account')
                }
                $('.auto-complete-box[data-key="to_account"]').html(this.template_candidate(vars));
            }

            // set account
            vars = {
                candidate_list: this.get_auto_complete_memo_related(memo, 'account')
            }
            $('.auto-complete-box[data-key="account"]').html(this.template_candidate(vars));

        },

        select_candidate: function(e){
            e.preventDefault();

            var memo = $(e.target).data('memo'),
                key = $(e.target).data('key'),
                value = $(e.target).data('value'),
                $this_input = $('#' + key),
                next_index = $('#' + key).index('.js-auto-complete:visible') + 1,
                $next_input = $('.js-auto-complete:visible:eq(' + next_index + ')');

            $('.auto-complete-box').hide();

            $this_input.val(value);

            if($next_input){
                $next_input.focus();
            }
        },

        get_auto_complete_memo_related: function(memo, about, behavior_type){
            var that = this,
                auto_complete_list,
                about_list_original,
                about_list_original_query = {},
                about_list_auto_complete = [],
                auto_complete_record,
                about_key,
                about_table,
                about_auto_complete_item_key;

            switch(about){
                case 'category':
                    about_key = 'cat_id';
                    about_table = 'category_list';
                    about_auto_complete_item_key = 'category';
                    about_list_original_query = {
                        behavior_type: behavior_type
                    }
                    break;
                case 'account':
                    about_key = 'account_id';
                    about_table = 'account_list';
                    about_auto_complete_item_key = 'account';
                    break;
                case 'to_account':
                    about_key = 'to_account_id';
                    about_table = 'account_list';
                    about_auto_complete_item_key = 'to_account';
                    break;
                // no default
            }

            auto_complete_list = MMB.datastore.auto_complete.query({
                key: about_key,
                memo: memo
            });

            about_list_original = MMB.datastore[about_table].query(about_list_original_query);

            _.forEach(about_list_original, function(about){
                auto_complete_record = _.find(auto_complete_list, function(record){
                    return ( record.get('value') === about.getId() );
                });

                var push = {
                    count: ( auto_complete_record ? auto_complete_record.get('count') : 0 ),
                    memo: memo,
                    key: about_auto_complete_item_key,
                    value: that.get_about_value(about),
                    get: function(key){
                        return this[key];
                    }
                };

                about_list_auto_complete.push(push);
            });

            // order by characters asc.
            about_list_auto_complete = _.sortBy(about_list_auto_complete, function(entry){
                return entry.get('value');
            });

            // order by count desc.
            about_list_auto_complete = _.sortBy(about_list_auto_complete, function(entry){
                return entry.get('count') * -1;
            });

            return about_list_auto_complete;
        },

        show_auto_complete_box: function(el){
            $('.auto-complete-box').hide();
            $(el).parents('.form-group').find('.auto-complete-box').show();
        },

        get_about_value: function(about){
            if(about.get('cat1')){
                return about.get('cat1') + ':' + about.get('cat2');
            }
            if(about.get('name')){
                return about.get('name');
            }
        },

        set_just_date: function(){
            this.just_date = $('#date').val();
        },

        filter_candidates: function(e){
            var $box = $(e.target).parents('.form-group').find('.auto-complete-box'),
                $candidates = $box.find('.js-auto-complete-candidate'),
                value = $(e.target).val(),
                regex = new RegExp(value);

            $candidates.each(function(){
                if( ! regex.test($(this).data('value'))){
                    $(this).hide();
                }else{
                    $(this).show();
                }
            });
        },

        delete_item: function(e){
            e.preventDefault();

            var id = $(e.target).data('id'),
                item = MMB.datastore.content.get(id),
                return_url = '#weekly/' + item.get('year') + '-' + item.get('month') + '-' + item.get('day');

            MMB.delete_auto_complete_info(item);

            item.deleteRecord();
            location.href = return_url;
        }

    }),

    View_setting: Backbone.View.extend({
        el: ".body",
        template: null,
        events: {
            "click .page-setting input" : "save_setting",
            "blur .page-setting input" : "save_setting",
            "click .js-delete-all-data": "delete_all_data"
        },
        render: function(){
            var vars;
            vars = {
                language: MMB.get_lang()
            };
            MMB.util.render_ajax('pages/setting.html', vars, this, 'template');
            return this;
        },
        save_setting: function(){
            var setting = {},
                value_obj = $('.js-form-setting').serializeArray();
            _.each(value_obj, function(obj){
                MMB.set_setting(obj.name, obj.value);
            });
            return this;
        },
        delete_all_data: function(){
            var lock_delete_words = $('.js-lock-delete-words').val(),
                all_data;

            if(lock_delete_words == 'Mytory MoneyBook' || location.hostname === 'localhost'){

                _.forEach(MMB.datastore, function(table){
                    all_data = table.query();
                    _.forEach(all_data, function(record){
                        record.deleteRecord();
                    });
                });

                $('.js-alert-body').text(polyglot.t("All data deleted."));
                $('.js-close-text').text(polyglot.t("Close"));
                $('.js-delete-all-data').remove();
            }else{
                $('.js-incorrect-words').removeClass('hidden');
            }
        }
    }),

    View_import: Backbone.View.extend({
        item_count: 0,
        register_interval: 20,
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
        drag_handle: function(e) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'copy';
            $(e.target).addClass('dragging');
        },
        drag_leave: function(e){
            $(e.target).removeClass('dragging');
        },
        drop_process: function(e){
            $(e.target).removeClass('dragging');
            var that = this,
                files,
                i,
                f,
                reader;
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            
            files = e.originalEvent.dataTransfer.files;
            for (i = 0; f = files[i]; i++){
                reader = new FileReader();
                // var name = f.name;
                reader.onload = function(the_file) {
                    var data = the_file.target.result;
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

            if(/지출 현황/.test(rows[2])){
                that.import_naver_withdrawal(rows);
            }else if(/수입 현황/.test(rows[2])){
                that.import_naver_deposit(rows);
            }else{
                alert("네이버에서 다운받은 엑셀이 아닌 것 같습니다.");
            }
        },
        import_naver_withdrawal: function (rows){
            var that = this,
                sheet1 = [],
                sheet2 = [],
                data = [],
                item,
                amount,
                i = 1,
                sleep_time = 0;

            sheet1 = this.get_content_rows(rows);

            _.forEach(sheet1, function(row){
                amount = row[3];

                if(amount !== '' && /[0-9]+/.test(amount.replace(/,/g, ''))){
                    sheet2.push(row);
                }
            });

            _.forEach(sheet2, function(row){
                item = {
                    behavior_type: 'withdrawal',
                    memo: row[2],
                    amount: parseInt(row[3].replace(/,/g, '')) + parseInt(row[4].replace(/,/g, '')),
                    account: (row[5] == '' ? '내 지갑' : row[5]),
                    cat1: row[7].split('>')[0],
                    cat2: row[7].split('>')[1] ? row[7].split('>')[1] : '',
                    year: row[0].substr(0, 4),
                    month: row[0].substr(5, 2),
                    day: row[0].substr(8, 2)
                };
                if(/이체\/대체>/.test(row[7])){
                    item.behavior_type = 'transfer';
                    item.to_account = row[7].replace(/이체\/대체>/, '');
                }
                data.push(item);
            });

            _.forEach(data, function(row){
                that.item_count++;
                sleep_time = Math.floor(that.item_count / 100) * 3000;
                setTimeout(function(){
                    $('.js-msg').removeClass('hidden').addClass('in').html(row.memo + ' 입력...');
                    MMB.register(_.clone(row));
                }, i * that.register_interval + sleep_time);
                i++;
            });

            setTimeout(function(){
                $('.js-msg').removeClass('in').addClass('hidden').html('');
            }, (i+1) * that.register_interval + i);

            return this;
        },
        import_naver_deposit: function (rows){
            var that = this,
                sheet1,
                sheet2 = [],
                data = [],
                item,
                amount,
                i = 1,
                sleep_time = 0;

            sheet1 = this.get_content_rows(rows);

            _.forEach(sheet1, function(row){
                amount = row[2];

                if(amount !== '' && /[0-9]+/.test(amount.replace(/,/g, ''))){
                    sheet2.push(row);
                }
            });

            _.forEach(sheet2, function(row){
                item = {
                    behavior_type: 'deposit',
                    memo: row[1],
                    amount: parseInt(row[2].replace(/,/g, '')),
                    account: (row[3] == '' ? '내 지갑' : row[3]),
                    cat1: row[4].split('>')[0],
                    cat2: row[4].split('>')[1] ? row[4].split('>')[1] : '',
                    year: row[0].substr(0, 4),
                    month: row[0].substr(5, 2),
                    day: row[0].substr(8, 2)
                };
                data.push(item);
            });

            _.forEach(data, function(row){
                that.item_count++;
                sleep_time = Math.floor(that.item_count / 100) * 3000;
                setTimeout(function(){
                    $('.js-msg').removeClass('hidden').addClass('in').html(row.memo + ' 입력...');
                    MMB.register(_.clone(row));
                }, i * that.register_interval + sleep_time);
                i++;
            });

            setTimeout(function(){
                $('.js-msg').removeClass('in').addClass('hidden').html('');
            }, (i+1) * that.register_interval + i);

            return this;
        },
        get_content_rows: function(rows){
            var sheet1 = [];

            _.forEach(rows, function(row){
                if(/[0-9]{4}년[0-9]{1,2}월[0-9]{1,2}일/.test(row)){
                    sheet1.push(row.replace(/"/g, '').split('\t'));
                }
            });
            return sheet1;
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
            location.href = '#weekly/' + $('.js-weekly-basic-date').val();
        },
        change_days: function(e){
            var current = $('.js-weekly-basic-date').val(),
                days = $(e.target).data('days'),
                target_date = moment(current, 'YYYY-MM-DD').add('days', days).format('YYYY-MM-DD');

            location.href = '#weekly/' + target_date;
        },
        template: null,
        render: function(opts){
            var that = this,
                i,
                week_data = [],
                list = [],
                date,
                result,
                item_set,
                day_of_the_week,
                sum;

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
                    result = MMB.datastore.content.query(query_opt);

                    date = moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('YYYY-MM-DD');
                    day_of_the_week = moment(opts.date, 'YYYY-MM-DD').subtract('days', i).format('dd');
                    sum = 0;

                    _.forEach(result, function(item){
                        if(item.get('behavior_type') === 'withdrawal'){
                            sum += item.get('amount');
                        }

                        item_set = {
                            item: item,
                            account: MMB.datastore.account_list.get(item.get('account_id'))
                        };

                        if(item.get('cat_id')){
                            item_set.cat = MMB.datastore.category_list.get(item.get('cat_id'));
                        }
                        if(item.get('to_account_id')){
                            item_set.to_account = MMB.datastore.account_list.get(item.get('to_account_id'));
                        }
                        list.push(item_set);
                    });

                    week_data.push({
                        date: date,
                        day_of_the_week: day_of_the_week,
                        list: list,
                        sum: sum
                    });
                    list = [];
                }

                vars = {
                    week_data: week_data
                };

                MMB.util.render_ajax('pages/weekly.html', vars, this, 'template');

                return this;
            }

        }
    }),

    View_category_list: Backbone.View.extend({
        el: '.body',
        template_level1: _.template($('#page-category-list-level1').html()),
        template_level2: _.template($('#page-category-list-level2').html()),

        render: function(opt){
            var cats,
                level1 = opt.level1;

            if( ! level1){
                // level1 목록을 보낸다.
                cats = this.get_level1_cat();
                this.$el.html(this.template_level1({
                    level: 1,
                    cats: cats
                }));
            }else{
                // level2를 보낸다.
                cats = this.get_level2_cat_by_parent(opt.behavior_type, level1);
                this.$el.html(this.template_level2({
                    behavior_type: opt.behavior_type,
                    parent: level1,
                    level: 2,
                    cats: cats
                }));
            }
        },

        get_level1_cat: function(){
            var cat = [];

            cat.withdrawal = this.get_cat_by_level('withdrawal', 1);
            cat.deposit = this.get_cat_by_level('deposit', 1);

            return cat;
        },
        get_level2_cat_by_parent: function(behavior_type, parent){
            var children = [];
            children = this.get_cat_by_level(behavior_type, 2, parent);

            return children;
        },
        get_cat_by_level: function(behavior_type, level, parent){
            var cat = [],
                already_exist,
                category_list = MMB.datastore.category_list.query({
                    behavior_type: behavior_type
                });

            _.forEach(category_list, function(entry){
                if(level == 2 && parent !== undefined){
                    if(entry.get('cat1') !== parent){
                        return true;
                    }
                }
                already_exist = _.find(cat, function(item){
                    return item == entry.get('cat' + level);
                });
                if( ! already_exist){
                    cat.push(entry.get('cat' + level));
                }
            });

            return cat;

        }
    }),

    View_category_add: Backbone.View.extend({
        el: '.body',
        template: _.template($('#page-category-add').html()),
        events: {
            "submit .js-category-add-form": "save"
        },
        render: function(opt){
            this.$el.html(this.template(opt));
        },
        save: function(e){
            e.preventDefault();
            var data = MMB.util.form2json('.js-category-add-form'),
                return_url,
                duplication,
                cat1,
                cat2;

            if(data.parent){
                cat1 = data.parent;
                cat2 = data.cat_name;
            }else{
                cat1 = data.cat_name;
            }

            if(/:/.test(cat1)){
                alert(polyglot.t('Category name cannot has colon(:).'));
                return false;
            }
            if(cat2 && /:/.test(cat2)){
                alert(polyglot.t('Category name cannot has colon(:).'));
                return false;
            }

            duplication = this.check_duplication(data.behavior_type, cat1, cat2);

            if(duplication){

                $('.js-alert').fadeIn();
                setTimeout(function(){
                    $('.js-alert').fadeOut();
                }, 5000);
                return false;
            }

            if(data.cat_level == 1){
                MMB.datastore.category_list.insert({
                    behavior_type: data.behavior_type,
                    cat1: data.cat_name,
                    cat2: data.cat_name
                });
                return_url = '#category/list';
            }else{
                MMB.datastore.category_list.insert({
                    behavior_type: data.behavior_type,
                    cat1: data.parent,
                    cat2: data.cat_name
                });
                return_url = '#category/list/' + data.behavior_type + '/' + data.parent;
            }

            location.href = return_url;
        },

        check_duplication: function(behavior_type, cat1, cat2){
            var length;

            if( ! cat2){

                // level 1
                length = MMB.datastore.category_list.query({
                    behavior_type: behavior_type,
                    cat1: cat1
                }).length;
            }else{

                // level 2
                length = MMB.datastore.category_list.query({
                    behavior_type: behavior_type,
                    cat1: cat1,
                    cat2: cat2
                }).length;
            }
            if(length > 0){
                return true;
            }else{
                return false;
            }
        }
    }),

    View_category_update: Backbone.View.extend({
        el: '.body',
        events: {
            "submit .js-category-update-form": "save",
            "click .js-category-delete": "delete",
            "focus .js-move-to-category": "set_move_to_auto_complete",
            "keyup .js-move-to-category": "filter_candidates",
            "submit .js-move-to-category-form": "move_to_category"
        },
        template1: _.template($('#page-category1-update').html()),
        template2: null,
        template_candidate: _.template($('#template-auto-complete-candidate').html()),
        render: function(opt){

            if(opt.cat2 === undefined){
                delete opt.cat2;
            }

            var category = MMB.datastore.category_list.query(opt)[0];

            if( ! opt.cat2){
                this.$el.html(this.template1({
                    category: category
                }));
            }else{
                this.template2 = MMB.util.render_ajax('pages/category2-update.html', {
                    category: category
                }, this, 'template2');
            }
        },
        save: function(e){
            var data,
                cat1_list,
                category;
            e.preventDefault();
            data = MMB.util.form2json('.js-category-update-form');

            if(data.cat2 === undefined){

                // cat1 수정
                cat1_list = MMB.datastore.category_list.query({
                    cat1: data.cat1_old_name
                });

                if(/:/.test(data.cat1)){
                    alert(polyglot.t('Category name cannot has colon(:).'));
                    return false;
                }

                _.forEach(cat1_list, function(entry){
                    entry.update({
                        cat1: data.cat1
                    });
                });
                location.href = '#category/list';
            }else{

                if(/:/.test(data.cat2)){
                    alert(polyglot.t('Category name cannot has colon(:).'));
                    return false;
                }

                // cat2 수정
                category = MMB.datastore.category_list.get(data.id);

                category.update({
                    cat1: data.cat1,
                    cat2: data.cat2
                });

                location.href = '#category/list/' + category.get('behavior_type') + '/' + category.get('cat1')
            }
        },
        delete: function(e){
            e.preventDefault();

            var cat1 = $(e.target).data('cat1'),
                cat2 = $(e.target).data('cat2'),
                behavior_type = $(e.target).data('behavior-type'),
                cat_id_list = [],
                cat1_list,
                list,
                item_list = [],
                category,
                result,
                cannot_delete_message = 'This has item. So cannot be deleted.';


            if( ! cat2){

                // level 1
                cat1_list = MMB.datastore.category_list.query({
                    behavior_type: behavior_type,
                    cat1: cat1
                });
                _.forEach(cat1_list, function(category){
                    cat_id_list.push(category.getId());
                });
                _.forEach(cat_id_list, function(cat_id){
                    list = MMB.datastore.content.query({
                        cat_id: cat_id
                    });
                    if(list.length > 0){
                        item_list = item_list.concat(list);
                    }
                });
                if(item_list.length > 0){
                    alert(polyglot.t(cannot_delete_message));
                }else{
                    _.forEach(cat_id_list, function(cat_id){
                        MMB.datastore.category_list.get(cat_id).deleteRecord();
                    });
                    location.href = '#category/list';
                }
            }else{

                // level 2
                result = cat1_list = MMB.datastore.category_list.query({
                    behavior_type: behavior_type,
                    cat1: cat1,
                    cat2: cat2
                });

                if( ! result){
                    alert(polyglot.t('The category already be deleted.'));
                    location.href = '#category/' + behavior_type + '/' + cat1;
                }else{
                    category = result[0];
                    list = MMB.datastore.content.query({
                        cat_id: category.getId()
                    });
                    if(list.length > 0){
                        alert(polyglot.t(cannot_delete_message));
                    }else{
                        category.deleteRecord();
                        location.href = '#category/list/' + behavior_type + '/' + cat1;
                    }
                }
            }
        },
        move_to_category: function(e){
            e.preventDefault();

            var data = MMB.util.form2json('.js-move-to-category-form'),
                list = MMB.datastore.content.query({
                    'cat_id': data.id
                }),
                cat_id = MMB.get_cat_id_by_category(data.category);

            if(cat_id === false){
                return false;
            }

            _.forEach(list, function(entry){
                var auto_complete,
                    new_count,
                    result;

                // minus
                auto_complete = MMB.datastore.auto_complete.query({
                    memo: entry.get('memo'),
                    key: 'cat_id',
                    value: entry.get('cat_id')
                })[0];

                new_count = auto_complete.get('count') - 1;

                if(new_count === 0){
                    auto_complete.deleteRecord();
                }else{
                    auto_complete.update({
                        count: new_count
                    });
                }

                // plus
                result = MMB.datastore.auto_complete.query({
                    memo: entry.get('memo'),
                    key: 'cat_id',
                    value: cat_id
                });

                if(result.length === 0){
                    MMB.datastore.auto_complete.insert({
                        memo: entry.get('memo'),
                        key: 'cat_id',
                        value: cat_id,
                        count: 1
                    });
                }else{
                    new_count = result[0].get('count') + 1;
                    result[0].update({
                        count: new_count
                    });
                }

                // update item
                entry.update({
                    cat_id: cat_id
                });
            });

            alert(polyglot.t('Complete'));
        },
        set_move_to_auto_complete: function(e){
            var data = MMB.util.form2json('.js-move-to-category-form'),
                vars,
                view_register;

            if( ! MMB.pages.register){
                MMB.pages.register = new MMB_Backbone.View_register;
            }

            vars = {
                candidate_list: MMB.pages.register.get_auto_complete_memo_related('', 'category', data.behavior_type)
            }

            $('.auto-complete-box[data-key="category"]').html(this.template_candidate(vars)).show();
        },
        filter_candidates: function(e){

            if( ! MMB.pages.register){
                MMB.pages.register = new MMB_Backbone.View_register;
            }
            MMB.pages.register.filter_candidates(e);
        }
    }),

    View_statistics: Backbone.View.extend({
        el: '.body',
        template: null,
        render: function(opt){
            var vars,
                query,
                balance_class,
                balance,
                list,
                prev_month,
                next_month,
                prev_month_link,
                next_month_link,
                statistics,
                by_account;

            prev_month = moment(opt.year + '-' + opt.month + '-01').subtract('months', 1).format('YYYY-MM').split('-');
            next_month = moment(opt.year + '-' + opt.month + '-01').add('months', 1).format('YYYY-MM').split('-');

            prev_month_link = '#statistics/whole/' + prev_month[0] + '/' + prev_month[1];
            next_month_link = '#statistics/whole/' + next_month[0] + '/' + next_month[1];

            query = {
                year: opt.year,
                month: opt.month
            };

            list = MMB.datastore.content.query(query);

            balance = this.get_balance(list);
            statistics = this.get_statistics(list);
            by_account = this.get_by_account(list);

            if(balance < 0){
                balance_class = 'danger';
            }else if(balance === 0){
                balance_class = 'active';
            }else{
                balance_class = 'success';
            }

            vars = {
                year: opt.year,
                month: opt.month,
                withdrawal: statistics.withdrawal,
                withdrawal_like_transfer: statistics.withdrawal_like_transfer,
                deposit: statistics.deposit,
                deposit_like_transfer: statistics.deposit_like_transfer,
                savings: statistics.savings,
                balance: balance,
                by_account: by_account,
                balance_class: balance_class,
                prev_month_link: prev_month_link,
                next_month_link: next_month_link
            }

            MMB.util.render_ajax('pages/statistics.html', vars, this, 'template');
        },

        get_balance: function(list){
            // 시나리오
            // 1. 그냥 수입 : 자산과 잔액에 더하면 된다.
            // 2. 그냥 지출 : 자산과 잔액에 빼면 된다.
            // 3. 은행에서 내 계좌로 이체(대출) : 은행은 마이너스 통장이 된다. 자산은 특별히 신경쓸 것 없다.
            //      다만 은행계좌의 돈을 잔액에 포함하면 안 된다. 수입이 된다.
            // 4. 내 계좌에서 은행으로 이체(대출 상환) : 자산은 마찬가지. 지출이 된다.
            // 5. 내 계좌에서 친구 빌려줌 계좌로 이체 : 친구 빌려줌 계좌는 잔액에 포함하면 안 된다. 자산은 그대로.
            //      지출이 되면 안 된다.
            // 6. 적금 : 자산에는 포함. 잔액엔 포함 안 한다. 지출이 되면 안 된다.

            var balance = 0,
                account,
                to_account;

            _.forEach(list, function(item){

                account = MMB.datastore.account_list.get(item.get('account_id'));
                if(item.get('to_account_id')){
                    to_account = MMB.datastore.account_list.get(item.get('to_account_id'));
                }

                switch(item.get('behavior_type')){
                    case 'withdrawal':
                        if(account.get('in_balance') === 'no'){
                            return true;
                        }
                        balance -= item.get('amount');

                        break;

                    case 'deposit':
                        if(account.get('in_balance') === 'no'){
                            return true;
                        }
                        balance += item.get('amount');
                        break;

                    case 'transfer':
                        if(account.get('in_balance') === 'yes'){
                            balance -= item.get('amount');
                        }
                        if(to_account.get('in_balance') === 'yes'){
                            balance += item.get('amount');
                        }

                    // no default
                }
            });

            return balance;
        },

        get_statistics: function(list){

            // 시나리오
            // 1. 그냥 수입      : 수입 - 내 소유 계좌에 돈이 들어오면 수입.
            // 2. 그냥 지출      : 지출 - 내 소유 계좌에서 돈이 나가면 지출.
            // 3. 돈 갚는다      : 지출성 이체 - 내 소유 계좌에서 다른 사람 소유 계좌로 돈이 나간다.
            // 4. 돈 빌린다      : 수입성 이체 - 다른 사람 소유 계좌에서 내 소유 계좌로 돈이 들어온다.
            // 5. 돈 꿔준다      : 지출성 이체 - 잔액에 포함되던 내 돈이 잔액에 포함 안 된다.
            // 6. 돈 돌려 받는다 : 수입성 이체 - 잔액에 표시 안 되던 내 돈이 잔액에 표시된다.
            // 5. 그냥 내 계좌 사이 이체 : 수입 지출에 카운트되면 안 된다.

            var account,
                to_account,
                withdrawal = 0,
                withdrawal_like_transfer = 0,
                deposit = 0,
                deposit_like_transfer = 0,
                savings = 0;

            _.forEach(list, function(item){
                account = MMB.datastore.account_list.get(item.get('account_id'));
                if(item.get('to_account_id')){
                    to_account = MMB.datastore.account_list.get(item.get('to_account_id'));
                }

                // 그냥 지출
                if(item.get('behavior_type') === 'withdrawal'){
                    withdrawal += item.get('amount');
                }

                // 그냥 수입
                if(item.get('behavior_type') === 'deposit'){
                    deposit += item.get('amount');
                }

                if(item.get('behavior_type') === 'transfer'){
                    if(account.get('owner') === 'mine' && to_account.get('owner') === 'mine'){
                        if(to_account.get('whether_savings') === 'yes'){

                            // 저금
                            savings += item.get('amount');
                        }else if(account.get('in_balance') === 'yes' && to_account.get('in_balance') === 'no'){

                            // 돈 꿔준다.
                            withdrawal_like_transfer += item.get('amount');
                        }else if(account.get('in_balance') === 'no' && to_account.get('in_balance') === 'yes'){

                            // 돈 돌려 받는다.
                            deposit_like_transfer += item.get('amount');
                        }
                    }else if(account.get('owner') === 'mine' && to_account.get('owner') === 'others'){

                        // 돈 갚는다.
                        withdrawal_like_transfer += item.get('amount');
                    }else if(account.get('owner') === 'others' && to_account.get('owner') === 'mine'){

                        // 돈 빌린다.
                        deposit_like_transfer += item.get('amount');
                    }
                }
            });

            return {
                withdrawal: withdrawal,
                deposit: deposit,
                withdrawal_like_transfer: withdrawal_like_transfer,
                deposit_like_transfer: deposit_like_transfer,
                savings: savings
            };
        },

        get_by_account: function(list){
            var item_list = list ? list : MMB.datastore.content.query(),
                account,
                by_account = {};

            _.forEach(item_list, function(item){

                if( ! by_account[item.get('account_id')]){
                    account = MMB.datastore.account_list.get(item.get('account_id'));
                    by_account[account.getId()] = {
                        name: account.get('name'),
                        amount: 0
                    }
                }

                if( item.get('to_account_id') && ! by_account[item.get('to_account_id')]){
                    account = MMB.datastore.account_list.get(item.get('to_account_id'));
                    by_account[account.getId()] = {
                        name: account.get('name'),
                        amount: 0
                    }
                }

                if(item.get('behavior_type') === 'withdrawal'){
                    by_account[item.get('account_id')].amount -= item.get('amount');
                }
                if(item.get('behavior_type') === 'deposit'){
                    by_account[item.get('account_id')].amount += item.get('amount');
                }
                if(item.get('behavior_type') === 'transfer'){
                    by_account[item.get('account_id')].amount -= item.get('amount');
                    by_account[item.get('to_account_id')].amount += item.get('amount');
                }
            });

            return by_account;
        }
    }),

    View_account_list: Backbone.View.extend({
        el: '.body',
        template: null,
        render: function(){

            var that = this,
                vars;

            vars = {
                account_list: MMB.datastore.account_list.query()
            };

            MMB.util.render_ajax('pages/account_list.html', vars, this, 'template');
        }
    }),

    View_account_update: Backbone.View.extend({
        el: '.body',
        template: null,
        template_candidate: _.template($('#template-auto-complete-candidate').html()),
        events: {
            "submit .js-account-update-form": "save",
            "focus .js-move-to-account": "set_move_to_auto_complete",
            "keyup .js-move-to-account": "filter_candidates",
            "submit .js-move-to-account-form": "move_to_account",
            "click .js-account-delete": "delete"
        },
        render: function(opt){

            var that = this,
                account_list = MMB.datastore.account_list.query();

            // 이거 제대로 안 됨.
            var vars = {
                account: (function(opt){
                    return _.find(account_list, function(account){
                        return ( opt.account === account.get('name') );
                    });
                }(opt))
            };

            MMB.util.render_ajax('pages/account_manage.html', vars, this, 'template');
        },
        save: function(e){
            var data,
                account,
                data_without_id;

            e.preventDefault();

            data = MMB.util.form2json('.js-account-update-form');
            account = MMB.datastore.account_list.get(data.id);

            data_without_id = _.clone(data);
            delete data_without_id.id;

            account.update(data_without_id);

            location.href = '#account/list';

        },
        set_move_to_auto_complete: function(e){
            var data = MMB.util.form2json('.js-move-to-account-form'),
                vars;

            if( ! MMB.pages.register){
                MMB.pages.register = new MMB_Backbone.View_register;
            }

            vars = {
                candidate_list: MMB.pages.register.get_auto_complete_memo_related('', 'account')
            }

            $('.auto-complete-box[data-key="account"]').html(this.template_candidate(vars)).show();
        },
        filter_candidates: function(e){

            if( ! MMB.pages.register){
                MMB.pages.register = new MMB_Backbone.View_register;
            }
            MMB.pages.register.filter_candidates(e);
        },
        move_to_account: function(e){
            e.preventDefault();

            var data = MMB.util.form2json('.js-move-to-account-form'),
                list = MMB.datastore.content.query({
                    'account_id': data.id
                }),
                to_list = MMB.datastore.content.query({
                    'to_account_id': data.id
                }),
                account_id = MMB.get_account_id_by_name(data.account);

            if(account_id === false){
                return false;
            }

            _.forEach(list, function(item){
                var auto_complete,
                    new_count,
                    result;

                MMB.update_auto_complete_record(item.get('memo'), 'account_id', item.get('account_id'), -1);
                MMB.update_auto_complete_record(item.get('memo'), 'account_id', account_id, +1);

                // update item
                item.update({
                    account_id: account_id
                });
            });

            _.forEach(to_list, function(item){
                var auto_complete,
                    new_count,
                    result;

                MMB.update_auto_complete_record(item.get('memo'), 'to_account_id', item.get('to_account_id'), -1);
                MMB.update_auto_complete_record(item.get('memo'), 'to_account_id', account_id, +1);

                // update item
                item.update({
                    to_account_id: account_id
                });
            });

            alert(polyglot.t('Complete'));
        },

        delete: function(e){
            e.preventDefault();

            var account_id = $(e.target).data('id'),
                cannot_delete_message = 'This has item. So cannot be deleted.',
                list,
                to_list;

            list = MMB.datastore.content.query({
                account_id: account_id
            });

            to_list = MMB.datastore.content.query({
                to_account_id: account_id
            });

            if(list.length + to_list.length > 0){
                alert(polyglot.t(cannot_delete_message));
                return false;
            }

            MMB.datastore.account_list.get(account_id).deleteRecord();

            location.href = "#account/list";
        }
    }),

    View_account_add: Backbone.View.extend({
        el: '.body',
        template: null,
        events: {
            "submit .js-account-update-form": "save"
        },
        render: function(){

            var that = this;

            // 이거 제대로 안 됨.
            var vars = {
                account: MMB.mock
            };

            if(this.template){
                this.$el.html(this.template(vars));
            }else{
                $.get('account_manage.html', function(data){
                    that.template = _.template(data);
                    that.$el.html(that.template(vars));
                });
            }
        },
        save: function(e){
            var data,
                account,
                data_without_id;

            e.preventDefault();

            data = MMB.util.form2json('.js-account-update-form');

            data_without_id = _.clone(data);
            delete data_without_id.id;

            MMB.datastore.account_list.insert(data_without_id);

            location.href = '#account/list';

        }
    })


};