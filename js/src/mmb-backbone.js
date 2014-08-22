var MMB_Backbone = {

    View_navbar: Backbone.View.extend({
        el: '.js-navbar',
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
            this.$el.html(this.template());
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
            // Try to finish OAuth authorization.
            MMB.dropbox_client.reset();
            MMB.dropbox_client.authenticate();
            return this;
        },
        render: function(){
            $('.body').html(this.template());
            return this;
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

                location.href = '#category/list/' + category.get('behavior_type') + '/' + category.get('cat1');
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
                vars;

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

            var account_list = MMB.datastore.account_list.query(),
                vars,
                account,
                amount;

            account = (function(opt){
                return _.find(account_list, function(account){
                    return ( opt.account === account.get('name') );
                });
            }(opt));

            account_balance = MMB.get_account_balance(account.getId());

            vars = {
                account: account,
                account_balance: account_balance
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

            MMB.print_balance_panel();

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
                account: MMB.mock,
                account_balance: null
            };

            if(this.template){
                this.$el.html(this.template(vars));
            }else{
                $.get('pages/account_manage.html', function(data){
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