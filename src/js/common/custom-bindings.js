import ko from "knockout";
import _ from "lodash";

let onDispose = ko.utils.domNodeDisposal.addDisposeCallback;
ko.bindingHandlers.toggleNav = {
    init: function(element, valueAccessor) {
        var wrapper = ko.unwrap(valueAccessor());
        $(element).on('click', function() {
            $(wrapper).toggleClass("show-nav");
        });

        onDispose(element, function() {
            $(element).off('click')
        });
    }
}

ko.bindingHandlers.isOpenFolder = {
    update: function(element, valueAccessor) {
        var isOpen = ko.unwrap(valueAccessor());

        if (isOpen) {
            $(element).text("folder_open");
        } else {
            $(element).text("folder");
        }
    }
}


ko.bindingHandlers.active = {
    update: function(element, valueAccessor) {
        var active = ko.unwrap(valueAccessor());

        if (active) {
            $(element).addClass("active");
        } else {
            $(element).removeClass("active");
        }
    }
}

ko.bindingHandlers.scroll = {
    init: function(element, valueAccessor) {
        $(element).css({
            height: `${$(element).outerHeight()}px`,
            'overflow-y': "auto",
            'overflow-x': "hidden"
        });
    }
}

ko.bindingHandlers.tooltip = {
    init: function(element, valueAccessor) {
        let text = ko.unwrap(valueAccessor());
        $(element).tooltip({
            viewport: {
                selector: 'body',
                padding: 0
            }
        });

        onDispose(element, function() {
            $(element).tooltip('remove')
        });
    }
}


ko.bindingHandlers.toggleBookmark = {
    update: function(element, valueAccessor) {
        var isBookmarked = ko.unwrap(valueAccessor());

        if (isBookmarked) {
            $(element).text("bookmark");
        } else {
            $(element).text("bookmark_border");
        }
    }
}

ko.bindingHandlers.isFavorite = {
    update: function(element, valueAccessor) {
        let isFavorite = ko.unwrap(valueAccessor());

        if (isFavorite) {
            $(element).text("star");
        } else {
            $(element).text("star_border");
        }
    }
}

ko.bindingHandlers.visibility = {
    update: function(element, valueAccessor) {
        let isVisible = ko.unwrap(valueAccessor());

        if (isVisible) {
            $(element).css("visibility", "visible");
        } else {
            $(element).css("visibility", "hidden");
        }
    }
}


ko.bindingHandlers.onEnter = {
    init: function(element, valueAccessor, allBindngs, viewModel) {

        $("body").on('keyup', function(event) {
            let isEnterKey = event.keyCode === '13';
            let execute = ko.unwrap(valueAccessor());
            if (isEnterKey) {
                execute.call(viewModel);
            }
        })
    }
}

ko.bindingHandlers.materialSelect = {
    init: function(element, valueAccessor) {
        let searchOption = valueAccessor();
        $(element).material_select();
        $(element).on('change', function() {
            // console.log("changed", $(element).val());
            searchOption($(element).val());
        })

        onDispose(element, function() {
            $(element).material_select('destroy')
            $('.tooltipped').tooltip('remove')
        });
    },
    update: function(element, valueAccessor, allBindings) {
        let value = ko.unwrap(valueAccessor());
        console.log("ko.bindingHandlers.materialSelect::update - value", value);
        $(element).material_select();
    }
}

ko.bindingHandlers.src = {
    update: function(element, valueAccessor, allBindings) {
        let src = ko.unwrap(valueAccessor());
        let isScrollTop = ko.unwrap(allBindings.get('scrollTopOnClick'));
        $(element).attr('src', src);
        if (isScrollTop) {
            $(".content").scrollTop(0);
        }
    }
}

ko.bindingHandlers.tooltip = {
    init: function(element, valueAccessor, allBindings) {
        let position = ko.unwrap(valueAccessor());
        let text = allBindings.get('text');
        $(element).attr('data-tooltip', text);
        $(element).tooltip({
            delay: 50,
            html: text
        });
    }
}

ko.bindingHandlers.singlePulseEffect = {
    init: function(element, valueAccessor) {

        let $element = $(element);
        $element.on('click', function() {
            console.log("single pulse click")
            $element.addClass('cbutton--click');
            $element.on('animationend', function() {
                $element.off('animationend');
                $element.removeClass('cbutton--click');
            });
        })

        onDispose(element, function() {
            console.log("onDispose", "singlePulseEffect");
            $element.off("click");
        });
    }
}

// ko.bindingHandlers.scrollTopOnClick = {
//     update: function(element, valueAccessor, allBindngs) {
//         $(element).click(function(event) {
//             let isTrue = !!ko.unwrap(valueAccessor());
//             if (isTrue) {
//                 $(".content").scrollTop(0);
//             }
//         })
//     }
// }
