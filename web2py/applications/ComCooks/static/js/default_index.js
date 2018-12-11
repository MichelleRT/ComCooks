// This is the js for the default/index.html view.
var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    // Enumerates an array.
    var enumerate = function(v) { var k=0; return v.map(function(e) {e._idx = k++;});};

    self.add_post = function () {
        // We disable the button, to prevent double submission.
        $.web2py.disableElement($("#add-post"));
        var sent_title = self.vue.form_title; // Makes a copy 
        var sent_content = self.vue.form_content; // 
        $.post(add_post_url,
            // Data we are sending.
            {
                post_title: self.vue.form_title,
                post_content: self.vue.form_content
            },
            // What do we do when the post succeeds?
            function (data) {
                // Re-enable the button.
                $.web2py.enableElement($("#add-post"));
                // Clears the form.
                self.vue.form_title = "";
                self.vue.form_content = "";
                // Adds the post to the list of posts. 
                var new_post = {
                    id: data.post_id,
                    post_title: sent_title,
                    post_content: sent_content
                };
                self.vue.post_list.unshift(new_post);
                // We re-enumerate the array.
                self.process_posts();
                if (self.vue.form_image != null){
                    self.add_image(data.post_id);
                }
            });
        // If you put code here, it is run BEFORE the call comes back.
        self.vue.isHidden = true;
    };

    self.add_image = function(post_idx) {

        var reader = new FileReader();
        var file = self.vue.form_image;
        // let file = self.vue.form_image;
        console.log(file);
        console.log(self.vue.form_image);

        reader.addEventListener("load", function () {
            // An image can be represented as a data URL.
            // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
            // Here, we set the data URL of the image contained in the file to an image in the
            // HTML, causing the display of the file image.
            self.vue.img_url = reader.result;
            
            $.post(image_post_url, {
                picture: reader.result,
                post_id: post_idx // Placeholder for more useful info.
            },
            // What do we do when the post succeeds?
            function (data) {
                console.log(data);
                window.location.href = window.location.href;
                
            });
        }, false);
        // Reads the file as a data URL. This triggers above event handler.
        reader.readAsDataURL(file);

    }

    self.get_posts = function() {
        $.getJSON(get_post_list_url,
            function(data) {
                // I am assuming here that the server gives me a nice list
                // of posts, all ready for display.
                self.vue.post_list = data.post_list;
                // Post-processing.
                self.process_posts();
                console.log("I got my list");
            }
        );
        console.log("I fired the get");
    };

    self.process_posts = function(thumb_clicked) {
        // This function is used to post-process posts, after the list has been modified
        // or after we have gotten new posts. 
        // We add the _idx attribute to the posts. 
        enumerate(self.vue.post_list);

        for(var i = 0; i < self.vue.post_list.length; i++){
            self.get_thumbs_count(i);
        }

        for(var i = 0; i < self.vue.post_list.length; i++){
            self.is_author(i);
        }
       
        // We initialize the smile status to match the like. 
        self.vue.post_list.map(function (e) {
            // I need to use Vue.set here, because I am adding a new watched attribute
            // to an object.  See https://vuejs.org/v2/guide/list.html#Object-Change-Detection-Caveats
            // The code below is commented out, as we don't have smiles any more. 
            // Replace it with the appropriate code for thumbs. 
            // // Did I like it? 
            // // If I do e._smile = e.like, then Vue won't see the changes to e._smile . 
            // Vue.set(e, '_smile', e.like);
            Vue.set(e, '_reply_list', []);
            Vue.set(e, '_showing_replies', false);
            // Vue.set(e, '_showing_post', false); 
            Vue.set(e, '_adding_reply', false);
            Vue.set(e, '_edit_button', e.edit_button);
            Vue.set(e, '_editing', false);
            Vue.set(e, '_thumb', e.thumb);
            Vue.set(e, '_thumb_count', e._thumb_count);
            Vue.set(e, '_thumb_object_color', e._thumb_object_color);
            // Number of stars to display.
            Vue.set(e, '_num_stars_display', e.rating);
        });
    };

    

    self.process_replies = function(post) {
        enumerate(post._reply_list);

        for(var i = 0; i < post._reply_list.length; i++){
            self.is_reply_author(post._reply_list[i]);
        }

        post._reply_list.map(function (e) {
            Vue.set(e, '_edit_button', e._edit_button);
            Vue.set(e, '_editing', e._editing);
        });
    }

    self.get_thumbs_count = function (post_idx) {
        console.log("get_thumbs_count");
        var p = self.vue.post_list[post_idx];
        
        $.getJSON(get_thumb_url, {
            post_id: p.id,
        }, function(data) {
            p._thumb_count = data.result;
        });
    };

    self.thumb_click = function (post_idx, thumb_clicked) {
        console.log("thumb clicked");
        var p = self.vue.post_list[post_idx];
        var thumb_s = thumb_clicked;

        if (thumb_s == p._thumb) {
            thumb_s = 'None';
        }
        p._thumb = thumb_s;
        
        $.post(set_thumb_url, {
            post_id: p.id,
            thumb_state: thumb_s,
        }, function (data) {
            self.get_thumbs_count(post_idx);
        });

    };

    self.thumb_up_hover = function (post_idx) {
        console.log("thumb up over");
        var p = self.vue.post_list[post_idx];

        if (p._thumb == 'd') {
            p._thumb_object_color = '#808080';
        }
    };

    self.thumb_down_hover = function (post_idx) {
        console.log("thumb down over");
        var p = self.vue.post_list[post_idx];

        if (p._thumb == 'u') {
            p._thumb_object_color = '#808080';
        }
    };

    self.thumb_out = function (post_idx) {
        console.log("thumb out");
        var p = self.vue.post_list[post_idx];

        p._thumb_object_color = '#000000';
    };

    self.is_author = function (post_idx) {
        console.log("checking post author");
        var p = self.vue.post_list[post_idx];

        $.getJSON(get_post_author_url, {
            post_id: p.id,
        }, function(data) {
            if (data.result == 1) {
                p._edit_button = true;
            } else {
                p._edit_button = false;
            }
        });
    }

    // self.edit_button_clicked = function (post_idx) {
    //     console.log("edit button clicked");
    //     var p = self.vue.post_list[post_idx];

    //     p._editing = true;
    // }

    // self.done_button_clicked = function (post_idx) {
    //     console.log("done button clicked");
    //     var p = self.vue.post_list[post_idx];

    //     $.post(edit_post_url, {
    //         post_id: p.id,
    //         new_text: p.post_content,
    //     });

    //     p._editing = false;
    // }

    self.show_replies_button_clicked = function (post_idx) {
        console.log("show replies button clicked");
        var p = self.vue.post_list[post_idx];

        // TODO: - get list of replies belonging to post and store
        $.getJSON(get_post_replies_url, {
            post_id: p.id,
        }, function (data) {
            p._reply_list = data.reply_list;
            self.process_replies(p);
        });

        p._showing_replies = true;
    }

    self.add_reply_button_clicked = function (post_idx) {
        console.log("add reply button clicked");
        var p = self.vue.post_list[post_idx];

        p._adding_reply = true;
    }

    self.submit_reply_button_clicked = function (post_idx) {
        console.log("submit_reply_button_clicked");
        var p = self.vue.post_list[post_idx];
        var replyContent = self.vue.reply_content;

        if (replyContent != ""){
            $.post(add_reply_url, {
                post_id: p.id,
                reply_content: replyContent
            }, function (data) {
                var new_reply = {
                    id: data.reply_id,
                    reply_content: data.reply_content,
                    reply_author: data.reply_author
                };

                p._reply_list.push(new_reply);
                self.process_replies(p);
            }); 
        }

        p._adding_reply = false;

        // Need this to clear the input form. Saves text even when button is clicked.
        self.vue.reply_content = "";
    }

    self.hide_replies_button_clicked = function (post_idx) {
        console.log("hide replies button clicked");
        var p = self.vue.post_list[post_idx];

        p._showing_replies = false;
        p._adding_reply = false;
    }

    self.is_reply_author = function (reply) {
        console.log("is_reply_author called");
        var r = reply;

        $.getJSON(get_reply_author_url, {
            reply_id: r.id,
        }, function(data) {
            if (data.result == 1) {
                r._edit_button = true;
            } else {
                r._edit_button = false;
            }
        });
    }

    self.edit_reply_button_clicked = function (reply) {
        console.log("edit reply button clicked");
        var r = reply;

        r._editing = true;
    }

    self.submit_reply_after_editing_button_clicked = function (reply) {
        console.log("submit reply button clicked");
        var r = reply;
        var replyContent = reply.reply_content;

        if (replyContent != ""){
            $.post(edit_reply_url, {
                reply_id: r.id,
                reply_content: replyContent
            }); 
        }

        r._editing = false;
    }

    self.cancel_post_button_clicked = function () {
        console.log("cancel post button clicked");
        self.vue.form_title = "";
        self.vue.form_content = "";
    }



    /*************************************************************** 
      Code to dynamically create paths for the wiki pages.
    ***************************************************************/
    var parts = window.location.href.split('/');
    var key = parts[parts.length-1];

    // Shows a new page if the key is a number 
    self.should_show_post_page = function(){
        var p = window.location.href.split('/');
        var k = p[p.length-1];
        // If the the key is a post id a.k.a an 
        // integer 
        if ( !isNaN(k) && 
            parseInt(Number(k)) == k && 
            !isNaN(parseInt(k, 10)) ){
            return true;
        }
        return false;
    }
   
    // Set the key = post_id for the post_title we clicked on 
    // 1) Pass in respective post id
    // 2) Create url with the post id
    self.click_title_to_page = function(post_idx) {
        // Generate url with post id 
        var url = window.location.origin + "/ComCooks/default/index/" + post_idx; 
        console.log("This is the url: ", url); 
        window.location.href = url;        

    }




    /*************************************************** 
     * Code to get a post for page/routing purposes
    ***************************************************/
    self.get_post = function (post_idx) {
        // var p = self.vue.post_list[post_idx];
        console.log("got here to just before the getJSON of get_post"); 
        $.getJSON(get_post_url, 
            {
                post_id: post_idx,
            },
            function (data) {
                self.vue.post_page_data = data.post;
                console.log("This is the data: ", data.post); 
                self.get_image();
            }
            );
        // p._showing_post = true; 
        // console.log("the get_post function has gotten here"); 
        // p._showing_replies = true;
    }


    self.edit_button_clicked = function (post_idx) {
        console.log("edit button clicked");
        // var p = self.vue.post_list[post_idx];
        var p = self.vue.post_page_data; 
        self.vue.post_edit = !self.vue.post_edit; 

        // console.log("This is p: ", p); // Actually prints out what we need...

        // p._editing = true;
    }

    self.done_button_clicked = function (post_idx) {
        console.log("done button clicked");
        var p = self.vue.post_page_data; 

        // console.log("This is p: ", p); // Actually prints out what we need...

        $.post(edit_post_url, {
            post_id: p.id,
            new_text: p.post_content,
            new_title: p.post_title,
        });

        // p._editing = false;
    }



    /*************************************************** 
     * Code for images
    ***************************************************/

    self.open_uploader = function () {
        $("div#uploader_div").show();
        self.vue.is_uploading = true;
    };

    self.close_uploader = function () {
        $("div#uploader_div").hide();
        self.vue.is_uploading = false;
        $("input#file_input").val(""); // This clears the file choice once uploaded.

    };

    self.upload_file = function (event) {
        // This function is in charge of: 
        // - Creating an image preview
        // - Uploading the image to GCS
        // - Calling another function to notify the server of the final image URL.

        // Reads the file.
        var input = event.target;
        var file = input.files[0];
        if (file) {
            // We want to read the image file, and transform it into a data URL.
            var reader = new FileReader();
            // We add a listener for the load event of the file reader.
            // The listener is called when loading terminates.
            // Once loading (the reader.readAsDataURL) terminates, we have
            // the data URL available. 
            reader.addEventListener("load", function () {
                // An image can be represented as a data URL.
                // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
                // Here, we set the data URL of the image contained in the file to an image in the
                // HTML, causing the display of the file image.
                self.vue.img_url = reader.result;

                var p = self.vue.post_page_data; 

                $.post(image_post_url, {
                    image_url: reader.result,
                    // blog_post_id: 1 // Placeholder for more useful info.
                    post_id: p.id, 
                    
                });
            }, false);
            // Reads the file as a data URL. This triggers above event handler. 
            reader.readAsDataURL(file);
        }
    };


    // // Now we should take care of the upload.
    // // Gets an upload URL.
    // console.log("Trying to get the upload url");
    // // var url = window.location.origin + "/ComCooks/default/index/get_upload_url"; 

    // $.getJSON('https://upload-dot-luca-teaching.appspot.com/start/uploader/get_upload_url',
    // // $.getJSON(url, 
    //     function (data) {
    //         // We now have upload (and download) URLs.
    //         // The PUT url is used to upload the image.
    //         // The GET url is used to notify the server where the image has been uploaded;
    //         // that is, the GET url is the location where the image will be accessible 
    //         // after the upload.  We pass the GET url to the upload_complete function (below)
    //         // to notify the server. 
    //         var put_url = data['signed_url'];
    //         var get_url = data['access_url'];
    //         console.log("Received upload url: " + put_url);
    //         // Uploads the file, using the low-level interface.
    //         var req = new XMLHttpRequest();
    //         // We listen to the load event = the file is uploaded, and we call upload_complete.
    //         // That function will notify the server of the location of the image. 
    //         req.addEventListener("load", self.upload_complete(get_url));
    //         // TODO: if you like, add a listener for "error" to detect failure.
    //         req.open("PUT", put_url, true);
    //         // req.send(file);
    //         req.send("test");
    //     });
      


    self.upload_complete = function(get_url) {
        // Hides the uploader div.
        self.vue.show_img = true;
        self.close_uploader();
        // console.log('The file was uploaded; it is now available at ' + get_url);
        // TODO: The file is uploaded.  Now you have to insert the get_url into the database, etc.
        var p = self.vue.post_page_data; 

        $.post(image_post_url, {
            post_id: p.id,  
            image_str: get_url, 
        }); 

    };


    // self.upload_complete = function(post_idx) {
    //     // Hides the uploader div.
    //     self.vue.show_img = true;
    //     self.close_uploader();
       
    //     // TODO: The file is uploaded.  Now you have to insert the get_url into the database, etc.
    //     // Need to insert photo into database
    //     var p = self.vue.post_page_data; 
    //     console.log("This is the p.id: ", p.id);
    //     console.log("This is the post_idx: ", post_idx); 

    //     // console.log("This is p: ", p); // Actually prints out what we need...
    //     // $.post(image_post_url, {
    //     //     post_id: p.id,
    //     //     new_text: p.post_content,
    //     //     new_title: p.post_title,
    //     // });
    // };


    self.get_image = function () {
        // console.log("We got to the get image function");
        var p = self.vue.post_page_data; 
        console.log("We got to the get image function", p);
        $.getJSON(image_get_url, 
            {
                post_id: p.id,
            },
            function (data) {
                console.log(data);
                self.vue.received_image = data.r.picture;
                console.log(self.vue.received_image);
            }
            );

        console.log("We got to the end of the get image function");

    };



    // Sort post list by alphabetical order
    self.alphaOrder = function () {
        $.getJSON(get_post_list_url,
            function(data) {
                // I am assuming here that the server gives me a nice list
                // of posts, all ready for display.
                self.vue.post_list = data.post_list;
                var p = self.vue.post_list;
                // console.log("this is the post list: ", self.vue.post_list); 
                // Post-processing.
                // self.process_posts();
                var alpha = p.sort(function(a,b){
                    var textA = a.post_title.toUpperCase();
                    var textB = b.post_title.toUpperCase();
                    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0; 
                    console.log("This is the post list", p); 
                });
                // console.log("got to alphaOrder");
            }
        );
        console.log("finished the alphaOrder");
        
    } 


    // Search through posts for relevant posts
    self.myFunction = function () {
        $.getJSON(get_post_list_url,
            function(data) {
                // I am assuming here that the server gives me a nice list
                // of posts, all ready for display.
                self.vue.post_list = data.post_list;
                var p = self.vue.post_list;
                var p_list = document.getElementById('post_list'); // properly gets the post list
                var input = document.getElementById('myInput'); 
                var filter = input.value; // Correctly gets each value inputed thru the keyboard
                // var po = document.getElementsByTagName('po'); 
                // console.log("This is each post by po: ", po); 

                console.log("This is the filter value: ", filter); 
                // var single_post = p_list.getElementByTagName('po');
                // console.log("This is the single post: ", single_post); 
                
                // Loop through all list items, and hide those who don't match the search query
                var searchSort = p.sort(function(a,b){
                    var textA = a.post_title;
                    

                    // console.log("This is the post_title: ", textA); 
                    // return (filter != textA) ? -1 : (filter == textA) ? 1 : 0; 
                    // console.log("This is the post list", p); 


                    var textB = b.post_title; 
                    var array = textA.split(" "); 
                    var brray = textB.split(" ");
                    // console.log("This is the split string: ", array); 

                    return (array.indexOf(filter) != -1) ? -1 : (brray.indexOf(filter) != -1) ? 1 : 0; 

                    console.log("got to the end of the searchSort function");
                    
                    // if (textA.toUpperCase().indexOf(filter) > -1) {
                    //     a.style.display = "";
                    //   } else {
                    //     a.style.display = "none";
                    //   }

                    // if (filter == textA){
                    //     // return a; // We want to return the post that fits the criteria 
                    //     console.log("This is the post title we want: ", textA); 
                    //     console.log("This is the post we want: ", a); 
                    //     return a
                    // }

                });
        });
    } 


    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            form_title: "",
            form_content: "",
            form_image: null, 
            star_indices: [1, 2, 3, 4, 5],
            post_list: [],
            isHidden: true,
            reply_content: "",
            // Images data 
            is_uploading: false,
            img_url: null,
            received_image: null,
            show_img: false,
            show_post_page: self.should_show_post_page(),
            key: key,
            editing_post: false, 
            post_edit: false, 
            image_bool: false, 
            isHiden: true, 
            post_page_data: {},
            self_page: true // Leave it to true, so initially you are looking at your own images.
        },    
        methods: {
            add_post: self.add_post,
            get_post: self.get_post, 
            add_image: self.add_image, 
            thumb_click: self.thumb_click,
            thumb_out: self.thumb_out,
            thumb_up_hover: self.thumb_up_hover,
            thumb_down_hover: self.thumb_down_hover,
            get_thumbs_count: self.get_thumbs_count,
            is_author: self.is_author,
            edit_button_clicked: self.edit_button_clicked,
            done_button_clicked: self.done_button_clicked,
            show_replies_button_clicked: self.show_replies_button_clicked,
            add_reply_button_clicked: self.add_reply_button_clicked,
            submit_reply_button_clicked: self.submit_reply_button_clicked,
            hide_replies_button_clicked: self.hide_replies_button_clicked,
            is_reply_author: self.is_reply_author,
            edit_reply_button_clicked: self.edit_reply_button_clicked,
            submit_reply_after_editing_button_clicked: self.submit_reply_after_editing_button_clicked,
            cancel_post_button_clicked: self.cancel_post_button_clicked, 
            // Images methods
            open_uploader: self.open_uploader,
            close_uploader: self.close_uploader,
            upload_file: self.upload_file,
            get_image: self.get_image,
            upload_complete: self.upload_complete,
            // Show the post page
            should_show_post_page: self.should_show_post_page,
            click_title_to_page: self.click_title_to_page,
            // Star ratings.
            stars_out: self.stars_out,
            stars_over: self.stars_over,
            set_stars: self.set_stars,
            alphaOrder: self.alphaOrder,
            myFunction: self.myFunction
        }
    });

    // If we are logged in, shows the form to add posts.
    if (is_logged_in) {
        $("#add_post").show();
    }

    // Gets the posts.
    self.get_posts();
    self.get_post(key); 

    self.testData = "testData";

    return self;
};

var APP = null;

// No, this would evaluate it too soon.
// var APP = app();

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});