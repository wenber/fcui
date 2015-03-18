/**
 * FCUI (Fengchao UI)
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 
 * @author Qian Zhi Xiang (qianzhixiang@baidu.com)
 */
define(
    function (require) {
        require('./Button');
        require('./MonthView');
        require('./CheckBox');
        require('./Label');

        var lib = require('./lib');
        var InputControl = require('./InputControl');
        var helper = require('./controlHelper');
        var Layer = require('./Layer');
        var ui = require('./main');
        var m = require('moment');
        var u = require('underscore');

        /**
         * 日历用浮层
         *
         * @extends Layer
         * @ignore
         * @constructor
         */
        function RangeCalendarLayer() {
            Layer.apply(this, arguments);
        }

        lib.inherits(RangeCalendarLayer, Layer);

        /**
         * 通过点击关闭弹层的处理方法
         *
         * @param {Event} e DOM事件对象
         * @ignore
         */
        function close(e) {
            var target = e.target;
            var layer = this.getElement(this);
            var main = this.control.main;

            if (!layer) {
                return;
            }

            while (target && (target !== layer && target !== main)) {
                target = target.parentNode;
            }

            if (target !== layer && target !== main) {
                this.hide();
            }
        }

        /**
         * 获取隐藏类
         *
         * @param {Object} layer Layer对象实例
         * @return {Array} 返回隐藏的类的数组
         */
        function getHiddenClasses(layer) {
            var classes = layer.control.helper.getPartClasses('layer-hidden');
            classes.unshift(ui.getConfig('uiClassPrefix') + '-layer-hidden');

            return classes;
        }

        /**
         * 获取浮层DOM元素
         *
         * @param {boolean} [create=true] 不存在时是否创建
         * @return {HTMLElement}
         * @override
         */
        RangeCalendarLayer.prototype.getElement = function (create) {
            var element = this.control.helper.getPart('layer');

            if (!element && create !== false) {
                element = this.create();
                this.render(element);
                lib.addClasses(element, getHiddenClasses(this));

                this.initBehavior(element);
                this.control.helper.addDOMEvent(
                    document, 'mousedown', u.bind(close, this));
                this.syncState(element);

                // IE下元素始终有`parentNode`，无法判断是否进入了DOM
                if (!element.parentElement) {
                    document.body.appendChild(element);
                }
            }

            return element;
        };

        RangeCalendarLayer.prototype.render = function (element) {
            var calendar = this.control;
            document.body.appendChild(element);
            element.innerHTML = getLayerHtml(calendar);
            calendar.helper.initChildren(element);

            // 为mini日历绑定点击事件
            var shortcutDom = calendar.helper.getPart('shortcut');
            helper.addDOMEvent(
                calendar, shortcutDom, 'click', shortcutClick);
            // 渲染开始结束日历
            paintCal(calendar, 'begin', calendar.view.begin, true);
            paintCal(calendar, 'end', calendar.view.end, true);


            // 渲染mini日历
            var selectedIndex = getSelectedIndex(calendar, calendar.view);
            paintMiniCal(calendar, selectedIndex);

            // 绑定“无限结束”勾选事件
            var endlessCheck = calendar.getChild('endlessCheck');
            if (endlessCheck) {
                endlessCheck.on(
                    'change',
                    lib.curry(makeCalendarEndless, calendar)
                );
                // 设置endless
                if (calendar.isEndless) {
                    endlessCheck.setChecked(true);
                    calendar.helper.addPartClasses(
                        'shortcut-disabled',
                        calendar.helper.getPart(calendar)
                    );
                }
            }

            // 绑定提交和取消按钮
            var okBtn = calendar.getChild('okBtn');
            okBtn.on('click', lib.curry(commitValue, calendar));

            var cancelBtn = calendar.getChild('cancelBtn');
            cancelBtn.on(
                'click',
                u.bind(calendar.layer.hide, calendar.layer)
            );
            // 关闭按钮
            var closeBtn = calendar.getChild('closeBtn');
            closeBtn.on(
                'click',
                u.bind(calendar.layer.hide, calendar.layer)
            );
        };

        RangeCalendarLayer.prototype.toggle = function () {
            var element = this.getElement();
            if (!element
                || this.control.helper.isPart(element, 'layer-hidden')
            ) {
                // 展示之前先跟main同步
                var calendar = this.control;
                paintLayer(calendar, calendar.rawValue);
                this.show();
            }
            else {
                this.hide();
            }
        };

        /**
         * 重绘弹出层数据
         *
         * @inner
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @param {{begin:Date,end:Date}=} value 显示的日期
         */
        function paintLayer(calendar, value) {
            calendar.view.begin = value.begin;
            calendar.view.end = value.end;
            calendar.value = calendar.convertToParam(value);

            paintCal(calendar, 'begin', value.begin);
            paintCal(calendar, 'end', value.end);

            var selectedIndex = getSelectedIndex(calendar, calendar.view);
            paintMiniCal(calendar, selectedIndex);

            var isEndless;
            if (!value.end) {
                isEndless = true;
            }
            else {
                isEndless = false;
            }
            calendar.setProperties({ isEndless: isEndless });
        }

        /**
         * 控件类
         *
         * @constructor
         * @param {Object} options 初始化参数
         */
        function RangeCalendar(options) {
            this.now = new Date();
            InputControl.apply(this, arguments);
            this.layer = new RangeCalendarLayer(this);
        }

        /**
         * 搭建弹出层内容
         *
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @return {string}
         */
        function getLayerHtml(calendar) {
            var tpl = ''
                + '<div class="${shortCutClass}" id="${shortcutId}">'
                + '${shortCut}</div>'
                + '<div class="${bodyClass}">'
                +   '${beginCalendar}${endCalendar}'
                + '</div>'
                + '<div class="${footClass}">'
                +   '<div class="${okBtnClass}"'
                +   ' data-ui="type:Button;childName:okBtn;">确定</div>'
                +   '<div class="${cancelBtnClass}"'
                +   ' data-ui="type:Button;childName:cancelBtn;">取消</div>'
                + '</div>'
                + '<div data-ui="type:Button;childName:'
                + 'closeBtn;skin:layerClose;height:12;"></div>';

            return lib.format(tpl, {
                bodyClass: calendar.helper.getPartClassName('body'),
                shortcutId: calendar.helper.getId('shortcut'),
                shortCutClass: calendar.helper.getPartClassName('shortcut'),
                shortCut: getMiniCalendarHtml(calendar),
                beginCalendar: getCalendarHtml(calendar, 'begin'),
                endCalendar: getCalendarHtml(calendar, 'end'),
                footClass: calendar.helper.getPartClassName('foot'),
                okBtnClass: calendar.helper.getPartClassName('okBtn'),
                cancelBtnClass: calendar.helper.getPartClassName('cancelBtn')
            });
        }

        /**
         * 获取某日开始时刻
         *
         * @param {Date} day 某日
         * @return {Date}
         */
        function startOfDay(day) {
            return m(day).startOf('day').toDate();
        }

        /**
         * 获取某日结束时刻
         *
         * @param {Date} day 某日
         * @return {Date}
         */
        function endOfDay(day) {
            return m(day).endOf('day').toDate();
        }

        /**
         * 判断是否不在可选范围内
         *
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @param {object} shortItem 快捷对象
         * @return {boolean}
         */
        function isOutOfRange(calendar, shortItem) {
            var range = calendar.range;
            var itemValue = shortItem.getValue.call(calendar);

            // 得先格式化一下，去掉时间
            if (startOfDay(range.begin) > startOfDay(range.begin)
                || endOfDay(itemValue.end) < endOfDay(itemValue.end)) {
                return true;
            }

            return false;
        }

        /**
         * 搭建快捷迷你日历
         *
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @return {string}
         */
        function getMiniCalendarHtml(calendar) {
            var shownShortCut = calendar.shownShortCut.split(',');
            var shownShortCutHash = {};
            for (var k = 0; k < shownShortCut.length; k++) {
                shownShortCutHash[shownShortCut[k]] = true;
            }

            var tplItem = ''
                + '<span data-index="${shortIndex}" class="'
                + calendar.helper.getPartClassName('shortcut-item')
                + ' ${shortClass}"'
                + ' id="${shortId}">${shortName}</span>';
            var shortItems = calendar.shortCutItems;
            var len = shortItems.length;
            var html = [];
            for (var i = 0; i < len; i++) {
                var shortItem = shortItems[i];
                if (shownShortCutHash[shortItem.name]) {
                    var shortName = shortItem.name;
                    var shortClasses = [];
                    if (i === 0) {
                        shortClasses = shortClasses.concat(
                            calendar.helper.getPartClasses(
                                'shortcut-item-first'
                            )
                        );
                    }
                    // 超出范围或者日历是无限结束
                    var disabled = isOutOfRange(calendar, shortItem);
                    if (disabled) {
                        shortClasses = shortClasses.concat(
                            calendar.helper.getPartClasses(
                                'shortcut-item-disabled'
                            )
                        );
                    }
                    var shortId = calendar.helper.getId('shortcut-item' + i);

                    html.push(
                        lib.format(
                            tplItem,
                            {
                                shortIndex: i,
                                shortClass: shortClasses.join(' '),
                                shortId: shortId,
                                shortName: shortName
                            }
                        )
                    );
                }
            }
            return html.join('');
        }

        /**
         * 搭建单个日历
         *
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @param {string} type 日历类型 begin|end
         * @return {string}
         */
        function getCalendarHtml(calendar, type) {
            var endlessCheckDOM = '';
            // 可以无限
            if (calendar.endlessCheck && type === 'end') {
                endlessCheckDOM = ''
                    + '<input type="checkbox" title="不限结束" '
                    + 'data-ui-type="CheckBox" '
                    + 'data-ui-child-name="endlessCheck" />';
            }
            var tpl = ''
                + '<div class="${frameClass}">'
                +   '<div class="${labelClass}">'
                +     '<h3>${labelTitle}</h3>'
                +     endlessCheckDOM
                +   '</div>'
                +   '<div class="${calClass}">'
                +     '<div data-ui="type:MonthView;'
                +     'childName:${calName}"></div>'
                +   '</div>'
                + '</div>';

            return lib.format(tpl, {
                frameClass: calendar.helper.getPartClassName(type),
                labelClass: calendar.helper.getPartClassName('label'),
                labelTitle: type == 'begin' ? '开始日期' : '结束日期',
                titleId: calendar.helper.getId(type + 'Label'),
                calClass: calendar.helper.getPartClassName(type + '-cal'),
                calName: type + 'Cal'
            });
        }

        /**
         * 将日历置为无结束时间
         *
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @param {CheckBox} checkbox CheckBox控件实例
         */
        function makeCalendarEndless(calendar) {
            var endCalendar = calendar.getChild('endCal');
            var shortCutItems = calendar.helper.getPart('shortcut');
            var selectedIndex;
            if (this.isChecked()) {
                calendar.isEndless = true;
                endCalendar.disable();
                selectedIndex = -1;
                calendar.view.end = null;
                calendar.helper.addPartClasses(
                    'shortcut-disabled', shortCutItems
                );
            }
            else {
                calendar.isEndless = false;
                endCalendar.enable();
                // 恢复结束日历的选择值
                updateView.apply(calendar, [endCalendar, 'end']);
                calendar.helper.removePartClasses(
                    'shortcut-disabled', shortCutItems
                );
            }
        }

        /**
         * 比较两个日期是否同一天(忽略时分秒)
         *
         * @inner
         * @param {Date} date1 日期.
         * @param {Date} date2 日期.
         * @return {boolean}
         */
        function isSameDate(date1, date2) {
            if ((!date1 && date2) || (date1 && !date2)) {
                return false;
            }
            else if (!date1 && !date2) {
                return true;
            }
            return m(date1).isSame(date2, 'day');
        }

        /**
         * 获取mini日历中应该选中的索引值
         *
         * @inner
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @param {{begin:Date,end:Date}} value 日期区间对象.
         * @return {number}
         */
        function getSelectedIndex(calendar, value) {
            var shortcutItems = calendar.shortCutItems;
            var len = shortcutItems.length;

            for (var i = 0; i < len; i++) {
                var item = shortcutItems[i];
                var itemValue = item.getValue.call(calendar);

                if (isSameDate(value.begin, itemValue.begin)
                    && isSameDate(value.end, itemValue.end)) {
                    return i;
                }
            }

            return -1;
        }

        /**
         * 根据索引选取日期
         *
         * @inner
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @param {number} index
         */
        function selectIndex(calendar, index) {
            var me = calendar;
            var shortcutItems = calendar.shortCutItems;

            if (index < 0 || index >= shortcutItems.length) {
                return;
            }

            var value = shortcutItems[index].getValue.call(me);
            var begin = value.begin;
            var end = value.end;

            calendar.view = { begin: begin, end: end };
            paintCal(calendar, 'begin', begin);
            paintCal(calendar, 'end', end);

            // 更新样式
            paintMiniCal(me, index);

        }

        /**
         * 渲染mini日历
         *
         * @inner
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @param {number} index 选择的索引
         */
        function paintMiniCal(calendar, index) {
            var shortcutItems = calendar.shortCutItems;
            var miniMode = calendar.miniMode;
            // 重置选择状态
            if (miniMode !== null && miniMode !== index) {
                calendar.helper.removePartClasses(
                    'shortcut-item-selected',
                    calendar.helper.getPart('shortcut-item' + miniMode)
                );
            }
            calendar.miniMode = index;
            if (index >= 0) {
                calendar.helper.addPartClasses(
                    'shortcut-item-selected',
                    calendar.helper.getPart('shortcut-item' + index)
                );
                calendar.curMiniName = shortcutItems[index].name;
            }
            else {
                calendar.curMiniName = null;
            }
        }

        /**
         * 初始化开始和结束日历
         *
         * @inner
         * @param {RangeCalendar} calendar RangeCalendar控件实例
         * @param {string} type 日历类型
         * @param {Date} value 日期
         * @param {boolean} bindEvent 是否需要绑定事件
         */
        function paintCal(calendar, type, value, bindEvent) {
            var monthView = calendar.getChild(type + 'Cal');
            if (!monthView) {
                return;
            }
            monthView.setProperties({
                rawValue: value,
                range: calendar.range
});
