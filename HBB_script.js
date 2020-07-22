(function () {
  // The WWT ScriptInterface singleton.
  var wwt_si = null;

  // The WWT WWTControl singleton.
  var wwt_ctl = null;

  // WWT Camera parameters
  var wwt_cp = null;
  var camera_zoom = 0;
  var whatisra = 0;
  var camera_params = null;

  // track zoom level and length for distance calculation.
  var currgal_distance = null
  var currgal_length = null;
  var view_height_rad = null;


  // global variables to hold the wwt_si navigation for the last thumbnail clicked, for use by the reset button
  var reset_enabled = false;
  var curr_clasification = null;
  var curr_name = null;
  var curr_RA = null;
  var curr_dec = null;
  var curr_FOV = null;

  function initialize() {
    // This function call is
    // wwt-web-client/HTML5SDK/wwtlib/WWTControl.cs:WWTControl::InitControlParam.
    // It creates a singleton WWTControl object, accessible here as
    // `wwtlib.WWTControl.singleton`, and returns a singleton
    // ScriptInterface object, also accessible as
    // `wwtlib.WWTControl.scriptInterface`.
    wwt_si = wwtlib.WWTControl.initControlParam(
      "wwtcanvas", // id of the <div> to draw in
      true  // use WebGL!
    );
    wwt_si.add_ready(wwt_ready);
  }

  $(document).ready(initialize);

  function wwt_ready() {
    wwt_ctl = wwtlib.WWTControl.singleton;
    wwt_cp = wwtlib.CameraParameters;

    wwt_si.settings.set_showConstellationBoundries(false);
    wwt_si.settings.set_showConstellationFigures(false);
    wwt_si.settings.set_showConstellationSelection(false);
    wwt_si.settings.set_showCrosshairs(false);
    setup_controls();

    //(variables defined inside a function are not known to other functions)
    loadWtml(function (folder, xml) {

      // store each of the Place objects from the WTML file in places
      var places = $(xml).find('Place');
      var thumbTemplate = $('<div class="col_thumb"><a href="javascript:void(0)" class="thumbnail border_white"><img src=""/><div class="thumbname">example</div</a></div>');
      var descTemplate = $('<div class="obj_desc container-fluid"><div class="row"><div class="name col-xs-12 col-md-12 col-lg-12"></div><div class="what col-xs-12 col-md-12 col-lg-12"></div><div class="characteristics col-xs-12 col-md-12 col-lg-12"></div></div></div>');
      var pointTemplate = $('<div><a href="#"><div class="plot_point"></div></a></div>')
      var constellations = $(xml).find('Constellation');
      var cmb = $(xml).find('CMB');

      places.each(function (i, pl) {
        var place = $(pl);

        // create a temporary object of a thumbnail and of a description element from the templates above 
        var tmpthumb = thumbTemplate.clone();
        var tmpdesc = descTemplate.clone();
        var tmppoint = pointTemplate.clone();

        tmpthumb.find('img').attr({
          src: place.find('ThumbnailUrl').text(),
          class: 'border_black',
          alt: place.attr('Name'),
          'data-toggle': 'tooltip',
          'data-placement': 'top',
          'data-container': 'body',
          title: place.find('Description').attr('Title')
        });

        tmppoint.find('.plot_point').attr({
          title: place.find('Description').attr('Title')
        })

        // locate the thumbnail name and replace html contents with content from WTML file
        var thumbname = place.find('.Thumbnail').html();
        tmpthumb.find('.thumbname').html(thumbname);

        // grab the class = Name/What/Before/Process/After/Elements/Properties/Dive html content for each Place from the WTML file
        var targetname = place.find('.Name').html();
        tmpdesc.find('.name').html(targetname);

        var targetwhat = place.find('.What').html();
        tmpdesc.find('.what').html(targetwhat);

        var targetcharacteristics = place.find('.Characteristics').html();
        tmpdesc.find('.characteristics').html(targetcharacteristics);

        var top = place.attr('Top');
        var left = place.attr('Left');
        tmppoint.find('.plot_point').css("top", top).css("left", left);


        // apply the unique target description class to the description template clone
        var desc_class = place.find('Target').text().toLowerCase() + "_description";
        tmpdesc.addClass(desc_class);


        // add event listener to every thumbnail element, which listens for single- vs. double-click
        function on_click(element, is_dblclick) {

          if (wwt_si === null) {
            return;
          };

          //	Change the border color of the selected thumbnail
          var element = element;

          $(".thumbnail img").removeClass("border_green").addClass("border_black");
          $(".thumbname").removeClass("text_green");
          $(element).parent().find("img").removeClass("border_black").addClass("border_green");
          $(element).parent().find(".thumbname").addClass("text_green");

          // enable the reset button (and hide if visible)
          reset_enabled = true;
          $("#reset_target").fadeOut(100);

          /* hide all descriptions, reset scrolls, then show description specific to this target on sgl/dbl click */
          var toggle_class = "." + place.find('Target').text().toLowerCase() + "_description";
          $("#description_box").find(".obj_desc").hide();
          $('#description_container').scrollTop(0).show();

          $(toggle_class).show();

          /* update the current length value */
          currgal_length = place.attr("Length");

          // Make arrow appear only for overflow
          var desc_box = $('#description_container')[0];

          if (desc_box.scrollHeight > desc_box.clientHeight) {
            //console.log("need arrow");
            $('.fa-arrow-down').show();
          } else {
            $('.fa-arrow-down').hide();
          }

          wwt_si.setBackgroundImageByName('Digitized Sky Survey (Color)');

          //set the global variables: current target classification / name / RA / dec / FOV
          curr_clasification = place.attr('Classification');
          curr_name = place.attr('Name');
          curr_RA = place.attr('RA');
          curr_dec = place.attr('Dec');
          curr_FOV = place.find('ImageSet').attr('FOV');

          wwt_si.settings.set_showConstellationFigures(false);
          wwt_si.settings.set_showConstellationLabels(false);

          wwt_si.setForegroundImageByName(place.attr('Name'));

          wwt_si.gotoRaDecZoom(
            parseFloat(place.attr('RA')) * 15,
            place.attr('Dec'),
            parseFloat(place.find('ImageSet').attr('FOV')),
            is_dblclick
          );
          // See if initializing this again helps?
          wwt_cp = wwtlib.CameraParameters;
          camera_params = wwt_cp.copy;
          console.log("Just did gotoRADecZoom. Camera fov is", camera_params);


        }

        tmpthumb.find('a')
          .data('foreground-image', place.attr('Name'))
          //'click' - false; 'dblclick' - true.  on('click', function () { on_click(false) });

          .on('click', function (event) {
            var element = event.target;
            on_click(element, false)
          })

          .on('dblclick', function (event) {
            var element = event.target;
            on_click(element, true)
          });

        tmpdesc.find('a').mouseenter(function () {
          var popup_id = "#" + place.attr('Index').toLowerCase() + "_spectrum"
          //console.log(popup_id)
          $(popup_id).show();
        })
        tmpdesc.find('a').mouseleave(function () {
          var popup_id = "#" + place.attr('Index').toLowerCase() + "_spectrum"
          $(popup_id).hide();
        })

        tmppoint.find('a')
          .data('foreground-image', place.attr('Name'))
          //'click' - false; 'dblclick' - true.  on('click', function () { on_click(false) });

          .on('click', function (event) {
            var element = event.target;
            on_click(element, false);
            //console.log("single click of plot_point");
          })

          .on('dblclick', function (event) {
            var element = event.target;
            on_click(element, true)
          });

        // Plug the set of thumbnails into the #destinationThumbs element
        $('#destinationThumbs').append(tmpthumb);

        $("#description_container").append(tmpdesc);

        $('#sloan_image_holder').append(tmppoint);

        // tag the reload button with a click action to reload the most recent thumbnail
        $("#reset_target").on('click', function (event) {

          //set the background image to DSS for any target reset
          wwt_si.setBackgroundImageByName('Digitized Sky Survey (Color)');

          wwt_si.settings.set_showConstellationFigures(false);
          wwt_si.settings.set_showConstellationLabels(false);

          wwt_si.setForegroundImageByName(curr_name);

          wwt_si.gotoRaDecZoom(
            parseFloat(curr_RA) * 15,
            curr_dec,
            parseFloat(curr_FOV),
            true
          );

          $("#reset_target").fadeOut(1000);

        })

      });

      // Add constellation links to text in description
      constellations.each(function (i, pl) {

        var constellation = $(pl);

        function on_click(element, is_dblclick) {

          if (wwt_si === null) {
            return;
          };

          // display the reset button
          $("#reset_target").show();

          wwt_si.setBackgroundImageByName('Digitized Sky Survey (Color)');
          wwt_si.settings.set_showConstellationFigures(true);
          wwt_si.settings.set_showConstellationLabels(true);

          wwt_si.gotoRaDecZoom(
            parseFloat(constellation.attr('RA')) * 15,
            constellation.attr('Dec'),
            parseFloat(constellation.find('ImageSet').attr('FOV')),
            false
          );

        }
        /*
                if (constellation.attr('Name') == "Orion Constellation") {
                  $(".orion_const").on('click', function(event){
                    console.log("clicked orion constellation link line 336 js")
                    var element = event.target;
                    on_click(element, false)
                  })
                } else if (constellation.attr('Name') == "Taurus Constellation") {
                  $(".taurus_const").on('click', function(event){
                    console.log("clicked taurus constellation link line 342 js")
                    var element = event.target;
                    on_click(element, false)
                  })
                } else if (constellation.attr('Name') == "Lyra Constellation") {
                  $(".lyra_const").on('click', function(event){
                    console.log("clicked lyra constellation link line 348 js")
                    var element = event.target;
                    on_click(element, false)
                  })
                }
        */

      });

    });

    // Setup timeout to monitor view parameters.

    var gal_length_el = $("#galaxy_length_text");
    var zoom_deg_el = $("#zoom_deg_text");
    var zoom_sec_el = $("#zoom_sec_text");
    var zoom_rad_el = $("#zoom_rad_text");
    var dist_el = $("#distance_text");

    var view_monitor = function () {
      // First order of business: schedule self to be called again in 30 ms.
      setTimeout(view_monitor, 30);

      // OK, get the view info.
      var view_cam = wwt_ctl.renderContext.viewCamera;

      // In sky mode, the zoom value Just Is six times the viewport height, in degrees.
      var view_height_deg = view_cam.zoom / 6;

      // Update the text of the HTML elements.

      zoom_deg_el.text(view_height_deg.toFixed(2) + "°");

      var view_height_sec = convert_to_sec(view_height_deg);

      zoom_sec_el.text(view_height_sec);

      view_height_rad = convert_to_rad(view_height_deg);

      zoom_rad_el.text(view_height_rad.toFixed(2) + " radians");

      gal_length_el.text(currgal_length + " mpc");

      dist_el.text()
    };

    var convert_to_sec = function (deg) {
      return deg.toFixed(6);
    };

    var convert_to_rad = function (deg) {
      return (Math.PI * deg) / 180;
    };

    var calculate_distance = function (rad) {
      return currgal_length / rad;
    }

    // Kick off the polling timer
    setTimeout(view_monitor, 30);
  };

  // Load data from wtml file
  function loadWtml(callback) {
    var hasLoaded = false;

    //This is what Ron calls getXml
    function getWtml() {
      //console.log("in getWtml function");
      if (hasLoaded) { return; }
      hasLoaded = true;
      $.ajax({
        url: wtmlPath,
        crossDomain: false,
        dataType: 'xml',
        cache: false,
        success: function (xml) {
          callback(wwt_si._imageFolder, xml)
        },
        error: function (a, b, c) {
          console.log({ a: a, b: b, c: c });
        }
      });
      //console.log("ran ajax thing");
    }

    var wtmlPath = "BUACHubbleBigBang.wtml";
    wwt_si.loadImageCollection(wtmlPath);
    console.log("Loaded Image Collection");
    getWtml();
    setTimeout(function () {
      getWtml();
    }, 1500);
    //trigger size_content function again after thumbnails have started loading
    setTimeout(function () {
      size_content();
    }, 500);
    //trigger size_content function a second time after thumbnails have started loading
    setTimeout(function () {
      size_content();
    }, 3000);
  };


  // Backend details: auto-resizing the WWT canvas.

  function size_content() {
    var container = $("html");
    var top_container = $(".top_container");
    var bottom_container = $(".bottom_container")
    var sloan_gutter = $(".sloan_gutter");

    // Constants here must be synced with settings in style.css
    const new_wwt_width = (top_container.width() - sloan_gutter.width());
    // subtract 52 to account for the margin and border in .css file
    const sloan_height = sloan_gutter.outerHeight(true);
    // const new_wwt_height = ((0.5 * container.height()) - 52);
    const new_wwt_height = top_container.height() - 2;  //set wwt_canvas height to fill top_container, subtract 2 to account for border width
    const colophon_height = $("#colophon").height();
    // subtract 20 to account for the margin in .css file, and give a little wiggle room

    const bottom_height = container.height() - top_container.outerHeight() - 50;
    const description_height = bottom_height - colophon_height;
    // const new_desc_height = (bottom_container.height() - colophon_height - 40);
    // const new_desc_height = (0.35 * container.height());
    //console.log("html: ", container.height())
    //console.log("top: ", top_container.outerHeight())
    //console.log("bottom: ", bottom_height)

    $("#wwtcanvas").css({
      "width": new_wwt_width + "px",
      "height": new_wwt_height + "px"
    });
    console.log("wwt height is ", $("#wwtcanvas").height());

    $(bottom_container).css({
      "height": bottom_height + "px"
    })

    $("#description_box").css({
      "height": description_height + "px"
      // "height": new_desc_height + "px"
    });

  }

  $(document).ready(size_content);
  $(window).resize(size_content);
  // also triggering size_content function in the load_wtml function, because thumbnails aren't loading immediately





  // Backend details: setting up keyboard controls.
  //
  // TODO: this code is from pywwt and was designed for use in Jupyter;
  // we might be able to do something simpler here.

  function setup_controls() {
    var canvas = document.getElementById("wwtcanvas");

    function new_event(action, attributes, deprecated) {
      if (!deprecated) {
        var event = new CustomEvent(action);
      } else {
        var event = document.createEvent("CustomEvent");
        event.initEvent(action, false, false);
      }

      if (attributes) {
        for (var attr in attributes)
          event[attr] = attributes[attr];
      }

      return event;
    }

    const wheel_up = new_event("wwt-zoom", { deltaY: 53, delta: 53 }, true);
    const wheel_down = new_event("wwt-zoom", { deltaY: -53, delta: -53 }, true);
    const mouse_left = new_event("wwt-move", { movementX: 53, movementY: 0 }, true);
    const mouse_up = new_event("wwt-move", { movementX: 0, movementY: 53 }, true);
    const mouse_right = new_event("wwt-move", { movementX: -53, movementY: 0 }, true);
    const mouse_down = new_event("wwt-move", { movementX: 0, movementY: -53 }, true);

    const zoomCodes = {
      "KeyI": wheel_up,
      "KeyO": wheel_down,
      73: wheel_up,
      79: wheel_down
    };

    const moveCodes = {
      "KeyA": mouse_left,
      "KeyW": mouse_up,
      "KeyD": mouse_right,
      "KeyS": mouse_down,
      65: mouse_left,
      87: mouse_up,
      68: mouse_right,
      83: mouse_down
    };

    window.addEventListener("keydown", function (event) {
      // "must check the deprecated keyCode property for Qt"
      if (zoomCodes.hasOwnProperty(event.code) || zoomCodes.hasOwnProperty(event.keyCode)) {
        // remove the zoom_pan instructions
        $("#zoom_pan_instrux").delay(5000).fadeOut(1000);

        var action = zoomCodes.hasOwnProperty(event.code) ? zoomCodes[event.code] : zoomCodes[event.keyCode];

        if (event.shiftKey)
          action.shiftKey = 1;
        else
          action.shiftKey = 0;

        canvas.dispatchEvent(action);
      }

      if (moveCodes.hasOwnProperty(event.code) || moveCodes.hasOwnProperty(event.keyCode)) {
        // remove the zoom_pan instructions
        $("#zoom_pan_instrux").delay(5000).fadeOut(1000);

        var action = moveCodes.hasOwnProperty(event.code) ? moveCodes[event.code] : moveCodes[event.keyCode];

        if (event.shiftKey)
          action.shiftKey = 1
        else
          action.shiftKey = 0;

        if (event.altKey)
          action.altKey = 1;
        else
          action.altKey = 0;

        canvas.dispatchEvent(action);
      }
    });

    canvas.addEventListener("wwt-move", (function (proceed) {
      console.log("moving around");
      return function (event) {
        if (!proceed)
          return false;

        if (event.shiftKey)
          delay = 500; // milliseconds
        else
          delay = 100;

        setTimeout(function () { proceed = true }, delay);

        if (event.altKey)
          wwt_ctl._tilt(event.movementX, event.movementY);
        else
          wwt_ctl.move(event.movementX, event.movementY);
      }
    })(true));

    canvas.addEventListener("wwt-zoom", (function (proceed) {
      //console.log("in zoom function");
      return function (event) {
        if (!proceed)
          return false;

        if (event.shiftKey)
          delay = 500; // milliseconds
        else
          delay = 100;

        setTimeout(function () { proceed = true }, delay);

        if (event.deltaY < 0) {
          wwt_ctl.zoom(1.43);
        }
        else {
          wwt_ctl.zoom(0.7);
        }

      }
    })(true));
  }

  // when user scrolls to bottom of the description container, remove the down arrow icon. Add it back when scrolling back up.
  $('#description_container').on('scroll', function (event) {
    var element = event.target;

    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      console.log("reached bottom!");
      $('.fa-arrow-down').fadeOut(200);
    }
    else {
      $('.fa-arrow-down').show();
    }
  })

  // may use later, in order to identify when canvas has been interacted with
  $('#wwtcanvas').on('click', function () {
    $("#zoom_pan_instrux").delay(5000).fadeOut(1000);

    if (reset_enabled) {
      $("#reset_target").show();
    }

  })

  // Distance Calculator Button (calculated on back end based on how much the screen is zoomed)
  $('#distance_button').on('click', function () {
    print_distance();
    //random attempts to get something to return the camera FOV/Zoom level
    //camera_zoom = wwt_si.settings.get_fovCamera;
    //console.log("Distance calculator FOV", camera_zoom);
    //wwt_cp = wwtlib.CameraParameters;
    //whatisra = wwt_cp.get_RA;
    //console.log("Distance calculator RA is ", whatisra);

    // print_time(zoom_level);  // Un-Comment this once zoom_level accurately captures the zoom level
  })

  function print_distance() {
    console.log("print distance");

    currgal_distance = currgal_length / view_height_rad;
    $('#distance').html(currgal_distance.toFixed(2) + " mpc");
  }


})();
