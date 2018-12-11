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
            });
        // If you put code here, it is run BEFORE the call comes back.
        self.vue.isHidden = true;
    };

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
            Vue.set(e, '_adding_reply', false);
            Vue.set(e, '_edit_button', e.edit_button);
            Vue.set(e, '_editing', false);
            Vue.set(e, '_thumb', e.thumb);
            Vue.set(e, '_thumb_count', e._thumb_count);
            Vue.set(e, '_thumb_object_color', e._thumb_object_color);
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

    self.edit_button_clicked = function (post_idx) {
        console.log("edit button clicked");
        var p = self.vue.post_list[post_idx];

        p._editing = true;
    }

    self.done_button_clicked = function (post_idx) {
        console.log("done button clicked");
        var p = self.vue.post_list[post_idx];

        $.post(edit_post_url, {
            post_id: p.id,
            new_text: p.post_content,
        });

        p._editing = false;
    }

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


    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            form_title: "",
            form_content: "",
            post_list: [],
            isHidden: true,
            reply_content: "",
        },    
        methods: {
            add_post: self.add_post,
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
            cancel_post_button_clicked: self.cancel_post_button_clicked
        }
    });

    // If we are logged in, shows the form to add posts.
    if (is_logged_in) {
        $("#add_post").show();
    }

    // Gets the posts.
    self.get_posts();

    return self;
};

var APP = null;

// No, this would evaluate it too soon.
// var APP = app();

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
