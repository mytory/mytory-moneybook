MMB_Backbone.View_statistics = Backbone.View.extend({
    el: '.page-statistics',
    template: null,
    render: function(opt){
        var vars,
            query,
            balance_class,
            balance,
            list,
            prev,
            next,
            prev_link,
            next_link,
            current_year = moment().format('YYYY'),
            current_month = moment().format('MM'),
            statistics,
            by_account;



        if(opt.month){
            prev = moment(opt.year + '-' + opt.month + '-01').subtract('months', 1).format('YYYY-MM').split('-');
            next = moment(opt.year + '-' + opt.month + '-01').add('months', 1).format('YYYY-MM').split('-');

            prev_link = '#statistics/' + prev[0] + '/' + prev[1];
            next_link = '#statistics/' + next[0] + '/' + next[1];
        }else if(opt.year){
            prev = moment(opt.year + '-01-01').subtract('years', 1).format('YYYY');
            next = moment(opt.year + '-01-01').add('years', 1).format('YYYY');

            prev_link = '#statistics/' + prev;
            next_link = '#statistics/' + next;
        }

        query = {};
        if(opt.year){
            query.year = opt.year;
        }
        if(opt.month){
            query.month = opt.month;
        }

        list = MMB.datastore.content.query(query);

        balance = this.get_balance(list);
        statistics = MMB.get_statistics(list);
        by_account = MMB.get_by_account(list);

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
            current_year: current_year,
            current_month: current_month,
            withdrawal: statistics.withdrawal,
            withdrawal_like_transfer: statistics.withdrawal_like_transfer,
            withdrawal_like: statistics.withdrawal + statistics.withdrawal_like_transfer,
            deposit: statistics.deposit,
            deposit_like_transfer: statistics.deposit_like_transfer,
            deposit_like: statistics.deposit + statistics.deposit_like_transfer,
            savings: statistics.savings,
            balance: balance,
            by_account: by_account,
            balance_class: balance_class,
            prev_month_link: prev_link,
            next_month_link: next_link
        };

        MMB.util.render_ajax('pages/statistics.html', vars, this, 'template');
    },

    get_balance: function(list){
        return MMB.get_balance(list);
    }

})