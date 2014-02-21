MMB_Backbone.View_register = Backbone.View.extend({
    el: '.body',
    template: null,
    template_candidate: _.template($('#template-auto-complete-candidate').html()),
    just_date: null,
    events: {
        "submit .js-register-form": "register",
        "click .js-behavior-type-box": "toggle_transfer_item",
        "blur #date": "set_just_date",

        "keyup .js-auto-complete": "auto_complete_memo_related",
        "focus .js-auto-complete": "auto_complete_memo_related_on_focus",
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
        };

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

        MMB.print_balance_panel();

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

        this.toggle_transfer_item();

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
        };

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
        };

        $('.auto-complete-box[data-key="amount"]').html(this.template_candidate(vars));

        if(behavior_type !== 'transfer'){

            // set category
            vars = {
                candidate_list: this.get_auto_complete_memo_related(memo, 'category', behavior_type)
            };
            $('.auto-complete-box[data-key="category"]').html(this.template_candidate(vars));
        }else{

            // set to_account
            vars = {
                candidate_list: this.get_auto_complete_memo_related(memo, 'to_account')
            };
            $('.auto-complete-box[data-key="to_account"]').html(this.template_candidate(vars));
        }

        // set account
        vars = {
            candidate_list: this.get_auto_complete_memo_related(memo, 'account')
        };
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
                };
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
        MMB.print_balance_panel();
        location.href = return_url;
    },

    auto_complete_memo_related_on_focus: function(e){
        this.auto_complete_memo_related(e);
        this.scroll_this(e);
    },

    scroll_this: function(e){
        window.scrollTo(0, $(e.target).offset().top - 30);
    }

});