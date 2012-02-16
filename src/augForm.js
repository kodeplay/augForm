/*!
 * jQuery Plugin for augmented forms
 * ie forms in which input fields might need to be added dynamically
 * for submitting at once
 *
 * eg. Forms generated by Django Formsets
 *
 * See examples
 *
 * Copyright 2011, (kodeplay)[http://kodeplay.com]
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */
(function ($) {

    $.fn.augForm = function (options) {

        /**
         * these determine how the new input item/element is to be generated or deleted
         * must return an object with functions onAdd and onDel implemented
         * inside onAdd function, 'this' is the jquery object on which augForm was invoked
         * inside onDel function, 'this' is the jquery object of the itemElem deleted
         */
        var templateHandlers = {

            /**
             * this is the default template handler
             * the calling code will pass html as string which will be
             * appended to the formset
             * config = {type: 'htmlAsString', tmpl: '<p>...</p>'
             */
            htmlAsString: function (config) {
                var that = this;
                var onAdd = function () {
                    that.append(config.tmpl);
                };

                return {
                    onAdd: onAdd,
                    // default ondel will work for this
                    onDel: function () { }
                };
            },

            /**
             * this template handler works with django formsets
             * it will use the first form in the formset and use the management
             * form to create and append blocks to formset by cloning and
             * modifying it as per django's requirement
             *
             * config = {
             *             type: 'djangoFormSet',
             *             MGMT_TOTAL_FORMS: $("input[name='form-TOTAL_FORMS']"),
             *             first_form: explicitly takes the first item of the formset for convenience
             * }
             */
            djangoFormSet: function (config) {

                var that = this;

                var onAdd = function () {
                    var $total_forms_field = config.MGMT_TOTAL_FORMS;
                    var $first_form = config.first_form;

                    // get total form count before adding a new one
                    // since django forms are 0 indexed, the next form added will be given this index
                    var count = $total_forms_field.val();

                    // create a clone
                    var $c = $first_form.clone();

                    // update the labels
                    $("label", $c).each(function () {
                        var attr_for = $(this).attr('for').replace('-0-', '-'+count+'-');
                        $(this).attr('for', attr_for);
                    });

                    // update the id, name and value for the input and select fields
                    $("input, select", $c).each(function () {
                        var attr_id = $(this).attr('id').replace('-0-', '-'+count+'-');
                        $(this).attr('id', attr_id);
                        var attr_name = $(this).attr('name').replace('-0-', '-'+count+'-');
                        $(this).attr('name', attr_name);
                        $(this).val('');
                    });

                    // get rid of any field error messages in the cloned block
                    $("ul.errorlist", $c).remove();

                    // find the wrapper element of the form
                    var formparent = $first_form.parent()[0];
                    var itemElem = formparent.nodeName.toLowerCase();
                    that.append($('<'+itemElem+'></'+itemElem+'>').append($c));

                    // update the form-TOTAL_FORMS in the management form
                    $total_forms_field.val(++count);
                };

                var onDel = function () {
                    // check the delete checkbox
                    $("input[name$='-DELETE']", this).attr('checked', 'checked');
                    // and now just hide it (not remove it)
                    this.fadeOut(200);
                };

                return {
                    onAdd: onAdd,
                    onDel: onDel
                };
            }
        };

        var settings = {
            itemElem: '', // li or a tr depending upon the object on which the fn is invoked
            addBtn: '', // button for adding a block
            rmBtn: '.rm-block', // button element for block removal
            min: 1, // min number of blocks, blocks can be deleted only until min block remain
            tmpl: '', // template of the block to be appended to the list,

            // tmplHandler: common scenarios of adding and removing fields have been 
            // written in tmplHandlers of two types 
            // 1. htmlAsString 
            // 2. djangoFormSet
            // in case none of these is to be used, pass false
            tmplHandler: {type: 'htmlAsString', 'tmpl': '<p>Html string passed to tmplHandler of type string will repeat'},

            // onAdd: this will be called after tmplHandler's onAdd is called.
            // but tmplHandler's onAdd will always be called.
            // it will not overwrite the tmplHandler's onAdd functionality
            onAdd: function () { },

            // onDel: also takes an onDel function,
            // default onDel behaviour, the itemElem is removed from dom.
            // override if you need to do something else
            // onDel: function () { }
        };

        $.extend(settings, options);

        var $obj = this;

        // 'this' inside this function refers to button object
        var showRmBtn = function () {
            // first hide all
            $(settings.rmBtn).hide();
            $itemElem = $(this).parents(settings.itemElem).eq(0);
            if ($itemElem.siblings().length > (settings.min-1)) {
                $(this).css('display', 'inline-block').show();
            }
        };

        // 'this' inside this function refers to button object
        var hideRmBtn = function () {
            $(this).hide();
        };

        // resolve the templaeHandler function from the type recieved and call it to load the object
        if (settings.tmplHandler) {
            var tmplHandlerObj = templateHandlers[settings.tmplHandler.type].call(this, settings.tmplHandler);
        } else {
            var tmplHandlerObj = { };
        }

        return this.each(function () {
            $(settings.addBtn).click(function () {
                // check if tmplHandlerObj defines an onAdd function
                if (typeof tmplHandlerObj.onAdd === 'function') {
                    tmplHandlerObj.onAdd.call($obj);
                }
                // then do anything else the user might have asked for
                settings.onAdd.call(this);
            });

            // on focus and mouseover of itemElem, call function to 
            // show the remove button
            $(settings.itemElem, this).live('mouseover focus', function (event) {
                $rmBtn = $(settings.rmBtn, $(this));
                showRmBtn.call($rmBtn[0])
            });

            // on blur and mouseout of itemElem, call function to 
            // hide the remove button
            $(settings.itemElem, this).live('mouseout blur', function (event) {
                $rmBtn = $(settings.rmBtn, $(this));
                hideRmBtn.call($rmBtn[0])
            });

            // handle the click event of the remove button
            // first check if user has defined onDel
            // fallback 1 - tmplHandlerObj's onDel
            // fallback 2 - default onDel which will remove the itemElem from Dom
            $(settings.rmBtn, $obj).live('click', function () {
                console.log(tmplHandlerObj);
                var $itemElem = $(this).parents(settings.itemElem).eq(0);
                if (typeof settings.onDel === 'function') {
                    settings.onDel.call($itemElem);
                } else if (typeof tmplHandlerObj.onDel === 'function') {
                    tmplHandlerObj.onDel.call($itemElem);
                } else {
                    $itemElem.fadeOut(200, function () {
                        $(this).remove();
                    });
                }
            });
        });
    }

}) (jQuery);