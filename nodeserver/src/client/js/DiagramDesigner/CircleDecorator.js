"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DefaultDecorator',
    'text!js/DiagramDesigner/CircleDecoratorTemplate.html',
    'css!DiagramDesignerCSS/CircleDecorator'], function (logManager,
                                                          util,
                                                          DefaultDecorator,
                                                          circleDecoratorTemplate) {

    var CircleDecorator,
        __parent__ = DefaultDecorator,
        __parent_proto__ = DefaultDecorator.prototype,
        CANVAS_SIZE = 40;

    CircleDecorator = function (options) {
        var opts = _.extend( {}, options);

        opts.loggerName = opts.loggerName || "CircleDecorator";

        __parent__.apply(this, [opts]);

        this.logger.debug("CircleDecorator ctor");
    };

    _.extend(CircleDecorator.prototype, __parent_proto__);

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    CircleDecorator.prototype.$_DOMBase = $(circleDecoratorTemplate);

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    CircleDecorator.prototype.on_addTo = function () {
        //find additional CircleDecorator specific UI components
        this.skinParts.$arrowCanvas = this.$el.find('[id="circleCanvas"]');
        this.skinParts.$arrowCanvas[0].height = CANVAS_SIZE;
        this.skinParts.$arrowCanvas[0].width = CANVAS_SIZE;
        var ctx = this.skinParts.$arrowCanvas[0].getContext('2d');
        if(ctx) {
            ctx.circle(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1, true);
        }

        //let the parent decorator class do its job first
        __parent_proto__.on_addTo.apply(this, arguments);
    };

    CircleDecorator.prototype.on_renderPhase1 = function () {
        //let the parent decorator class do its job first
        __parent_proto__.on_renderPhase1.apply(this, arguments);

        this.renderPhase1Cache.nameWidth = this.skinParts.$name.outerWidth();
    };

    CircleDecorator.prototype.on_renderPhase2 = function () {
        var shift = (40 - this.renderPhase1Cache.nameWidth) / 2;

        this.skinParts.$name.css({"top": 45,
            "left": shift });

        //let the parent decorator class do its job finally
        return __parent_proto__.on_renderPhase2.apply(this, arguments);
    };

    CircleDecorator.prototype.calculateDimension = function () {
        this.hostDesignerItem.width = this.skinParts.$arrowCanvas[0].width;
        this.hostDesignerItem.height = this.skinParts.$arrowCanvas[0].height + this.skinParts.$name.outerHeight(true);
    };

    CircleDecorator.prototype.getConnectionAreas = function (id) {
        var result = [],
            width = this.skinParts.$arrowCanvas[0].width,
            height = this.skinParts.$arrowCanvas[0].height;

        //by default return the bounding box edges midpoints

        //top left
        result.push( {"id": "0",
            "x": width / 2,
            "y": 0,
            "w": 0,
            "h": 0,
            "orientation": "N"} );

        result.push( {"id": "1",
            "x": width / 2,
            "y": height,
            "w": 0,
            "h": 0,
            "orientation": "S"} );

        result.push( {"id": "2",
            "x": 0,
            "y": height / 2,
            "w": 0,
            "h": 0,
            "orientation": "N"} );

        result.push( {"id": "3",
            "x": width,
            "y": height / 2,
            "w": 0,
            "h": 0,
            "orientation": "S"} );

        return result;
    };

    return CircleDecorator;
});