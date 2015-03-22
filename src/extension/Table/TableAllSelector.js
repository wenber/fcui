/**
 * @file fcui Table extension
 *     如果Table的select为multi，并且使用该extension，则table就有全选功能。
 * 
 * @author Cory(kuanghongrui@baidu.com)
 */

define(function (require) {
    var _ = require('underscore');
    var fc = require('fc-core');
    var fcui = require('../../main');
    var Extension = require('../../Extension');
    var aop = require('fc-core/aop');
    var AllSelector = require('../../AllSelector');

    /**
     * 全选组件的宽度
     * 
     * @const
     * @type {number}
     */
    var SELECT_ALL_WIDTH = 18;

    /**
     * 全选组件的高度
     * 
     * @const
     * @type {number}
     */
    var SELECT_ALL_HEIGHT = 16;

    /**
     * 全选组件所在的列的列宽。
     * 
     * @const
     * @type {number}
     */
    var SELECT_ALL_COLUMN_WIDTH = 60;

    var TableAllSelector = fc.oo.derive(Extension, {
        /**
         * 类型声明
         * @type {string}
         */
        type: 'TableAllSelector',

        /**
         * 插件激活
         * @override
         */
        activate: function () {
            var me = this;
            var table = this.target;
            me._renderTableHead = table.renderHead;
            table.renderHead = function () {
                me._renderTableHead.apply(table, arguments);
                if (table.select === 'multi') {
                    me.allSelector = me.renderAllSelector();
                }
            };
        },

        /**
         * 渲染全选按钮
         * @return {AllSelector} 全选按钮
         */
        renderAllSelector: function () {
            var table = this.target;
            table.getHead().querySelectorAll('.ui-table-hcell .ui-table-select-all')[0].style.display = 'none';
            var allSelector = fcui.create('AllSelector', {
                id: table.helper.getId('all-selector'),
                width: SELECT_ALL_WIDTH,
                height: SELECT_ALL_HEIGHT
            });
            var hcellNode = table.getHead().querySelector('.ui-table-hcell .ui-table-hcell-text');
            hcellNode.className += ' ' + table.helper.getPartClasses('all-selector').join(' ');
            allSelector.appendTo(hcellNode);
            return allSelector;
        }

    });
    fcui.registerExtension(TableAllSelector);
    return TableAllSelector;
});