//  angularModalService.js
//
//  Service for showing modal dialogs.

/***** JSLint Config *****/
/*global angular  */
(function () {

    'use strict';

    var module = angular.module('angularModalService', []);

    module
        .service('ModalService', ModalService);

    ModalService.$inject = ['$animate', '$document', '$compile', '$controller', '$rootScope', '$q', '$templateRequest', '$timeout'];
    function ModalService($animate, $document, $compile, $controller, $rootScope, $q, $templateRequest, $timeout) {
        var body = $document.find('body');

        return {
            showModal: createModal,
            showBsModal: showBsModal
        };

        function validateOptions(options) {
            if (!options.controller) {
                throw 'No controller specified';
            }
            if (!(options.templateUrl || options.template)) {
                throw 'No template specified';
            }
        }

        function createModal(options) {
            validateOptions(options);
            return getTemplate(options.template, options.templateUrl)
                .then(compileModal);

            //  Returns a promise which gets the template, either
            //  from the template parameter or via a request to the
            //  template url parameter.
            function getTemplate(template, templateUrl) {
                if (template) {
                    var d = $q.defer();
                    d.resolve(template);
                    return d.promise;
                } else if (templateUrl) {
                    return $templateRequest(templateUrl, true);
                } else {
                    return $q.reject("No template or templateUrl has been specified.");
                }
            }

            function compileModal(template) {
                //  Create the inputs object to the controller - this will include
                //  the scope, as well as all inputs provided.
                //  We will also create a deferred that is resolved with a provided
                //  close function. The controller can then call 'close(result)'.
                //  The controller can also provide a delay for closing - this is
                //  helpful if there are closing animations which must finish first.
                var closeDeferred = $q.defer();
                var closedDeferred = $q.defer();

                //  Create a new isolate scope for the modal.
                var modalScope = $rootScope.$new(true);
                var inputs = {
                    $scope: modalScope,
                    close: destroyFn
                };

                //  If we have provided any inputs, pass them to the controller.
                if (options.inputs) angular.extend(inputs, options.inputs);

                //  Compile then link the template element, building the actual element.
                //  Set the $element on the inputs so that it can be injected if required.
                var linkFn = $compile(template);
                var modalElement = linkFn(modalScope);
                inputs.$element = modalElement;

                //  Create the controller, explicitly specifying the scope to use.
                var modalController = $controller(options.controller, inputs);

                if (options.controllerAs) {
                    modalScope[options.controllerAs] = modalController;
                }

                //  Finally, append the modal to the dom.
                if (options.appendElement) {
                    // append to custom append element
                    appendChild(options.appendElement, modalElement);
                } else {
                    // append to body when no custom append element is specified
                    appendChild(body, modalElement);
                }

                //  We now have a modal object...
                return {
                    controller: modalController,
                    scope: modalScope,
                    element: modalElement,
                    destroy: destroyFn,
                    close: closeDeferred.promise,
                    closed: closedDeferred.promise
                };

                //  Adds an element to the DOM as the last child of its container
                //  like append, but uses $animate to handle animations. Returns a
                //  promise that is resolved once all animation is complete.
                function appendChild(parent, child) {
                    var children = parent.children();
                    if (children.length > 0) {
                        return $animate.enter(child, parent, children[children.length - 1]);
                    }
                    return $animate.enter(child, parent);
                }

                function destroyFn(result, delay) {
                    return $timeout(function () {
                        //  Resolve the 'close' promise.
                        closeDeferred.resolve(result);

                        //  Let angular remove the element and wait for animations to finish.
                        return $animate.leave(modalElement)
                            .then(function () {
                                //  Resolve the 'closed' promise.
                                closedDeferred.resolve(result);

                                //  We can now clean up the scope
                                modalScope.$destroy();

                                //  Unless we null out all of these objects we seem to suffer
                                //  from memory leaks, if anyone can explain why then I'd
                                //  be very interested to know.
                                inputs.close = null;
                                closeDeferred = null;
                                inputs = null;
                                modalElement = null;
                                modalScope = null;
                            });
                    }, delay || 0);
                }
            }
        }

        function showBsModal(controllerName, templateUrl, resolve) {
            return createModal({
                templateUrl: templateUrl,
                controller: controllerName,
                inputs: resolve
            }).then(function (modal) {
                // show element as bootstrap modal
                modal.element.modal();
                // destroy element, scope etc. when bootstrap modal is hidden
                modal.element.on('hidden.bs.modal', modal.destroy);
            });
        }
    }

}());
