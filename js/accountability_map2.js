//@namespace accountabilityMap


$( document ).ready(function()  {

    myApp.editSeatOverlay.init();
    myApp. seatPopup.init();

    window.wysiEditor = new wysihtml5.Editor('wysihtml-textInput', {
        toolbar: 'wysihtml-toolbar',
        parserRules: wysihtml5ParserRules,
    });
});


var myApp = (function() {

    //nodes represents the seats.
    const nodeWidth = 150,
        nodeHeight = 180,
        nodeTextSize = "16px",
        // horizontal and vertical gap
        verticalGap = 60,
        horizontalGap = 20,
        scaleExtent = [0.3, 5] //used in zoom

    window.dummyId = 0; //id set to nodes
    let duration = 700;

    let selectedSeat = null;
    let selectSeat = function (data) { selectedSeat = data; }


    setHeightMindmapContainer(); //make sure tocall this before setitng zoom.translate and svg.attr(transform)

    //spacing between nodes
    let tree = d3.layout.tree()
        .nodeSize([nodeWidth + horizontalGap, nodeHeight + verticalGap])
        .separation(function (a, b) { return (a.parent == b.parent ? 1 : 1.2); });

    //how to render links between nodes
    let diagonal = d3.svg.diagonal()
        .source(function (d) { return { x: d.source.x, y: d.source.y }; })
        .target(function (d) {
            return { x: d.target.x, y: d.target.y - nodeHeight };
        });


    let zoom = d3.behavior.zoom()
        .scaleExtent(scaleExtent)
        .on("zoom", updateZoom);

    let svg = d3.select("#diagram_container").append("svg")
        .attr("id", "svg")
        .attr("width", $('#diagram_container').outerWidth(true) + 'px')
        .attr("height", $('#diagram_container').outerHeight(true) + 'px')
        .call(zoom)
        .append("g")
        .attr("id", "gNodesContainer")

    //set our root node vertically centered
    zoom.translate([$('#diagram_container').width() / 2, nodeHeight])
    d3.select("#gNodesContainer").attr("transform", "translate(" + $('#diagram_container').width() / 2 + ", " + nodeHeight + " )");

    let sourceData = constructData(window.seatData);

    let updateMap = function(source) {

        // Compute the new tree layout.
        let nodes = tree.nodes(seatsViewModel.mapData()).reverse();
        let links = tree.links(nodes);

        // updateMap the nodes…
        let node = svg.selectAll("g.node")
            .data(nodes, function (d) { return d.id() || d.id(++dummyId); });


        let nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function (d) { return "translate(" + source.x + "," + source.y + ")"; });

        nodeEnter.append("rect")
            .attr("height", nodeHeight)
            .attr("width", nodeWidth)
            .attr("rx", 10)
            .attr("ry", 10)
            .style("fill", function(d){
                return d.depth === 0 ? "#fff" : d.depth === 1 ? "blue" : "green";
            })
            .attr("class", 'nodeRect')
            .attr("transform", function (d) { return "translate(" + (-nodeWidth / 2) + "," + (-nodeHeight) + ")"; });


        nodeEnter.append("circle")
            .attr("r", 7)
            .on("click", function (d) {
                nodeClicked(d, this);
            });


        nodeEnter.append("text")
            .text(function (d) { return d.title() })
            .style("fill-opacity", 1)
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", 0)
            .attr("class", "node-seat-title")
            .attr("font-size", nodeTextSize)
            .attr("width", nodeWidth - 35)
            // .on("click", function(){ })
            .call(wrap)
            .attr("y", function (d) {
                return (-nodeHeight / 2) - 30;
            })


        // operate on old and new text elements
        d3.selectAll(".node-seat-title").text(function (d) { return d.title() })
            .call(wrap)
            .attr("y", function (d) {
                return (-nodeHeight / 2) - 30;
            })

        nodeEnter.append("text")
            .text(function (d) { return d.seatOwner() || 'Vacant' })
            .style("fill-opacity", 1)
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", 0)
            .attr("class", "seat-owner")
            .attr("font-size", nodeTextSize)
            .attr("width", nodeWidth - 35)
            // .on("click", function(){ })
            .call(wrap)
            .attr("y", function (d) {
                return (-nodeHeight / 2) + 20;
            })


        // operate on old and new text elements
        d3.selectAll(".seat-owner").text(function (d) { return d.seatOwner() || 'Vacant' })
            .call(wrap)
            .attr("y", function (d) {
                return (-nodeHeight / 2) + 20;
            })


        let nodeButtonsContainer = nodeEnter.append("g")
            .attr("class", "nodeButtons")
            .attr("transform", "translate( 10, -20 )")
            .style('fill', '#fff')

        //position the icon buttons relative to its nodeButtonsContainer
        //Node Action Icons - Add
        nodeButtonsContainer.filter( seatCanAddChild ).append("path")
            .attr("d", "M12 24c-6.627 0-12-5.372-12-12s5.373-12 12-12c6.628 0 12 5.372 12 12s-5.372 12-12 12zM12 3c-4.97 0-9 4.030-9 9s4.030 9 9 9c4.971 0 9-4.030 9-9s-4.029-9-9-9zM13.5 18h-3v-4.5h-4.5v-3h4.5v-4.5h3v4.5h4.5v3h-4.5v4.5z")
            .attr("transform", `translate( ${0} , ${-20} )`) //NOTE: MODIFY POSITION OF ADD BUTTON HERE
            .attr("class", "function-btn add")

        nodeButtonsContainer.filter( seatCanAddChild ).append("rect")
            .attr("class", "function-bg add")
            .attr("width", "24px")
            .attr("height", "24px")
            .attr("transform", `translate( ${0} , ${-20} )`)
            .on("click", function (d) {
                addNode(d);
            });

        //Node Action Icons - Remove
        nodeButtonsContainer.filter(seatCanBeDeleted).append("path")
            .attr("d", "M3.514 20.485c-4.686-4.686-4.686-12.284 0-16.97 4.688-4.686 12.284-4.686 16.972 0 4.686 4.686 4.686 12.284 0 16.97-4.688 4.687-12.284 4.687-16.972 0zM18.365 5.636c-3.516-3.515-9.214-3.515-12.728 0-3.516 3.515-3.516 9.213 0 12.728 3.514 3.515 9.213 3.515 12.728 0 3.514-3.515 3.514-9.213 0-12.728zM8.818 17.303l-2.121-2.122 3.182-3.182-3.182-3.182 2.121-2.122 3.182 3.182 3.182-3.182 2.121 2.122-3.182 3.182 3.182 3.182-2.121 2.122-3.182-3.182-3.182 3.182z")
            .attr("transform", `translate( ${20} , ${5} )`) //NOTE: MODIFY POSITION OF REMOVE BUTTONS HERe
            .attr("class", "function-btn remove");

        nodeButtonsContainer.filter(seatCanBeDeleted).append("rect")
            .attr("class", "function-bg remove")
            .attr("width", "24px")
            .attr("height", "24px")
            .attr("transform", `translate( ${20} , ${5} )`)
            .on("click", deleteNode);

        // Node Action Icons - more(ellipsis)
        nodeButtonsContainer.append("path")
            .attr("d", "M12.572 2.731c-5.436 0-9.841 4.405-9.841 9.841S7.136 22.413 12.572 22.413c5.436 0 9.841-4.405 9.841-9.841S18.008 2.731 12.572 2.731M12.572 21.377c-4.856 0-8.805-3.949-8.805-8.804S7.715 3.768 12.572 3.768c4.855 0 8.805 3.949 8.805 8.805S17.427 21.377 12.572 21.377M12.572 10.76c-.999 0-1.813.812-1.813 1.813S11.572 14.386 12.572 14.386s1.812-.813 1.812-1.814S13.571 10.76 12.572 10.76M12.572 13.35c-.427 0-.777-.349-.777-.777S12.144 11.795 12.572 11.795 13.349 12.145 13.349 12.572 12.999 13.35 12.572 13.35M17.751 10.76c-.999 0-1.813.812-1.813 1.813s.813 1.814 1.813 1.814 1.813-.813 1.813-1.814S18.751 10.76 17.751 10.76M17.751 13.35c-.427 0-.777-.349-.777-.777s.349-.777.777-.777S18.528 12.145 18.528 12.572 18.179 13.35 17.751 13.35M7.392 10.76c-.999 0-1.813.812-1.813 1.813s.812 1.814 1.813 1.814S9.205 13.572 9.205 12.572 8.392 10.76 7.392 10.76M7.392 13.35c-.427 0-.777-.349-.777-.777S6.965 11.795 7.392 11.795 8.169 12.145 8.169 12.572 7.82 13.35 7.392 13.35")
            .attr("transform", `translate( ${0} , ${30} )`)
            .attr("stroke", "#FF6600")
            .attr("stroke-width", "1.5")
            .attr("class", "function-btn ")

        nodeButtonsContainer.append("rect")
            .attr("class", "function-bg more")
            .attr("width", "24px")
            .attr("height", "24px")
            .attr("transform", `translate( ${0} , ${30} )`)
            .on("click", function(d) {
                    selectSeat(d);
                    seatPopup.show(d)
                });

        let nodeupdate = node.transition()
            .duration(duration)
            .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")" })

        // Transition exiting nodes to the parent's new position.
        let nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function (d) { return "translate(" + source.x + "," + source.y + ")"; })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // update the links…
        let link = svg.selectAll("path.link")
            .data(links, function (d) { return d.target.id(); });

        //diagonal path link
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function (d) {
                let o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function (d) {
                let o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

    } /*end updateMap*/

    function nodeClicked(d, node) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        updateMap(d);
    }

    function hideRocks(d, node) {

        //hide all uncollapsed rock children
        if (d.children) {

            d.children.forEach(
                function (child, index) {

                    if (child.title() == 'Rock') {

                        child.parent._children2 ? child.parent._children2.push(child) : child.parent._children2 = [child];

                        child.parent.children.splice(index, 1);

                    } else {
                        hideRocks(child);
                    }
                }
            )
        }
        updateMap(d);
    }

    function showRocks(d, node) {

        //hide all uncollapsed rock children
        if (d._children && _children2) {
            
            d._children2.forEach( function(child, index ){
                child.parent._children.push(child) 
            })

            d._children2 = null;

            if(d._children2) {
                d_.children2.forEach(
                    function (child, index) {
                        
                    }
                )
            }

        
            child.parent.children2 = null;
            updateMap(d);
        }
    
    }

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
        updateMap(d);
    }


    function addNode(d) {

        d3.event.stopPropagation();

        if (d._children) {
            d.children = d._children;
            d._children = null;
        }

        if (!d.children) {
            d.children = new Array();
        }


        let newChild = new Seat({ title: "New Seat", seatOwner : "Vacant", username : ' ', description: ' '});

        d.children.push(newChild);
        updateMap(d);

    }

    function deleteNode(d) {

        let p = d.parent;
        let n_children = new Array();

        for (let i = 0; i < p.children.length; i++) {
            if (d.id() != p.children[i].id()) {
                n_children.push(p.children[i]);
            }
        }

        if (n_children.length > 0) {
            p.children = n_children;
        } else {
            p.children = null;
        }

        updateMap(p);
    }


    function constructData(data) {
        let object = new Seat(data),
            children = [];

        $.each(data.children || [], function (index, value) {
            let child = constructData(value);
            children.push(child)
        });

        object.children = children;
        return object;
    }

    /**************************** Knockout JS ****************************************/

    function Seat(data) {

        let self = this;
        data = data || {};
        self.id = ko.observable(data.id || ++dummyId);
        self.title = ko.observable(data.title || 'data has no title?');
        self.seatOwnerId = ko.observable(data.seatOwnerId);
        self.seatOwner = ko.observable(data.seatOwner || 'data has no seat name?');
        self.username = ko.observable(data.username || 'data has no username?');
        self.description = ko.observable(data.description || 'data has no seat description?');

    }

    //View Model Function
    function seatsViewModel(data) {
        let self = this;

        self.mapData = ko.observable(data);

        //subscribe to be notified of changes(only the changes)
        self.mapData.subscribe(function (newMapData) {
        console.log('self.mapData.subscribe called');
            updateMap(self.mapData());
        });

        //KO select seat name
        self.selectedSeatOwnerId = ko.observable();
        self.teamMembers = ko.observableArray(window.teammates);

        self.getTeamMemberById = function( id ) {
            var member = self.teamMembers().find( function (member) { return member.id === viewModel.selectedSeatOwnerId(); });
            return member;
        }
    }

    //Init Map

    var seatsViewModel = new seatsViewModel({});

    window.viewModel = seatsViewModel;

    ko.applyBindings(seatsViewModel);

    seatsViewModel.mapData(sourceData);



    function setHeightMindmapContainer() {
        let newHeight = "" + $(window).height() - $(".navbar").outerHeight(true);
        $("#diagram_container").css("height", newHeight);
    }

    // ZOOM / PAN STUFF
    function updateZoom() {
        d3.select("#gNodesContainer").attr("transform", "translate(" +
            d3.event.translate + ")" + "scale(" + d3.event.scale + ")");
        //window.currentScale = zoom.scale();
        //window.translate=  zoom.translate();
    }


    function seatCanAddChild(d) {
        //disable for visionary
        return d.depth > 0;
    }

    function seatCanBeDeleted(d) {
        //only visionary(top-most level) cannot be deleted
        return d.depth > 0 ;
    }


    /****************************************
    overlays/popup/popovers below
    *****************************************/

    // cuurent seat driopdown
    let seatPopup = {

        init: function() {
            this.container = $(".seat_popup");
            this.seatTitle = $('.seat-title');
            this.seatOwner = $('.seat-name');
            this.seatUsername = $('.seat-username');
            this.seatDescription = $('.seat-description');
            this.editButton = $('.edit-seat');

            this.registerHandlers();
        },

        show: function( seatObj ) {
            // init popoverlay plugin
            this.container.popup({
                tooltipanchor: $('body'),
                type: 'tooltip',
                autoopen: true,
                offsetleft: event.pageX,
                offsettop: event.pageY,
                autozindex: true,
                horizontal: 'leftedge',
                vertical: 'topedge',
                keepfocus: false,
                closeelement: ".close-seat-popup",
            });

            //render ui,
            this.seatTitle.text(seatObj.title());
            this.seatOwner.text(seatObj.seatOwner());
            this.seatUsername.text(seatObj.username());
            this.seatDescription.html( seatObj.description());

            //set the KO select default value
            viewModel.selectedSeatOwnerId( selectedSeat.seatOwnerId() );


        },

        registerHandlers: function(){
            this.editButton.click(function (e) {

            });
        }

    };


    window.editSeatOverlay = {

        init: function () {

            this.container = $("#edit_seat_overlay");
            this.formID = "update_content";
            this.seatTitleInput = $('#title_input');

            //initialize popupoverlay
            this.container.popup({
                color: "rgba(51, 0, 102, 0.75)",
                closeelement: '.edit-seat-close',
                openelement : '.edit-seat-open',
                opacity: 1,
                onopen: function(){

                    //viewModel = global variable contains reference to seatsViewModel

                    editSeatOverlay.seatTitleInput.val( selectedSeat.title() ) ;

                    //think of depth as heirarchy level. top-most = depth 0, 2nd to the top = depth 1
                    //disable input for 1st(Visionary) and 2nd(Integrator) level seats.
                    editSeatOverlay.seatTitleInput.attr('disabled', selectedSeat.depth < 2 ? true : false );

                    setTimeout(function() { editSeatOverlay.seatTitleInput.focus(); }, 100);

                    wysiEditor.setValue( selectedSeat.description() );

                }
            });


            this.registerHandlers();

        },

        saveForm: function(){
            //update data
            selectedSeat.title( this.seatTitleInput.val() );
            selectedSeat.description( $('#wysihtml-textInput').val() );

            if( typeof viewModel.selectedSeatOwnerId() !== "undefined") {
                let selectedMember = viewModel.getTeamMemberById( viewModel.selectedSeatOwnerId() );

                selectedSeat.seatOwner( selectedMember.fullName );
                selectedSeat.username( selectedMember.login );
                selectedSeat.seatOwnerId( selectedMember.id );

            } else {
                //todo double check
                selectedSeat.seatOwner( null );
                selectedSeat.username( null );
                selectedSeat.seatOwnerId( null );
            }

            updateMap(selectedSeat)
        },

        registerHandlers(){
            let self = this;

            document.forms[ self.formID ].addEventListener('submit', function (evt) {

                evt.preventDefault();

                self.saveForm();

                self.container.popup('hide');

            });

            // next
        }
    };

    return {
        editSeatOverlay,
        seatPopup 
    };


})();