<!-- target: dropLayer -->
<div class="${titleClass}" >
    ${title|raw}
    <div id="${closeId}" class="${closeIconClass}">
        <i></i>
    </div>
</div>
<div class="${contentClass}" id="${contentId}" >
    ${content|raw}
</div>
<div class="${footerClass}">
    <div data-ui-type="FcButton" data-ui-child-name="confirmBtn"
        data-ui-skin="ui-fc-important" class="${layer-confirm-button | class}">确定</div>
    <div data-ui-type="FcButton" data-ui-child-name="cancelBtn"
        class="${layer-cancel-button | class}">取消</div>
</div>
