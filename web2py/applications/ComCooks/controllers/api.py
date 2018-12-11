# Here go your api methods.
import tempfile
# Cloud-safe of uuid, so that many cloned servers do not all use the same uuids.
from gluon.utils import web2py_uuid

@auth.requires_signature()
def add_post():
    post_id = db.post.insert(
        post_title=request.vars.post_title,
        post_content=request.vars.post_content,
    )
    # We return the id of the new post, so we can insert it along all the others.
    return response.json(dict(post_id=post_id))


def get_post_list():
    results = []
    if auth.user is None:
        # Not logged in.
        rows = db().select(db.post.ALL, db.my_images.ALL, 
                            left=[
                                db.my_images.on(db.my_images.post_id == db.post.id), 
                            ],
                            orderby=~db.post.post_time)

        count = db.post.id.count()
        for row in rows:
            results.append(dict(
                id=row.post.id,
                post_title=row.post.post_title,
                post_content=row.post.post_content,
                post_author=row.post.post_author,
                # thumb = None if row.thumb.id is None else row.thumb.thumb_state,
                my_images = None if row.my_images.id is None else row.my_images.picture, 
             
            ))
    else:
        # Logged in.
        rows = db().select(db.post.ALL, db.thumb.ALL, db.my_images.ALL, 
                            left=[
                                db.thumb.on((db.thumb.post_id == db.post.id) & (db.thumb.user_email == auth.user.email)),
                                db.my_images.on(db.my_images.post_id == db.post.id), 
                            ],
                            orderby=~db.post.post_time)

        count = db.post.id.count()
        for row in rows:
            results.append(dict(
                id=row.post.id,
                post_title=row.post.post_title,
                post_content=row.post.post_content,
                post_author=row.post.post_author,
                thumb = None if row.thumb.id is None else row.thumb.thumb_state,
                my_images = None if row.my_images.id is None else row.my_images.picture, 
             
            ))
    # For homogeneity, we always return a dictionary.
    return response.json(dict(post_list=results))

@auth.requires_signature()
def set_thumbs():
    post_id = int(request.vars.post_id)
    thumb = request.vars.thumb_state
    if thumb != 'None':
        db.thumb.update_or_insert(
            (db.thumb.post_id == post_id) & (db.thumb.user_email == auth.user.email),
            post_id = post_id,
            user_email = auth.user.email,
            thumb_state = thumb
        )
    else:
        db((db.thumb.post_id == post_id) & (db.thumb.user_email == auth.user.email)).delete()
    return "🤯"

@auth.requires_login()
def get_thumbs_count():
    post_id = int(request.vars.post_id)
    thumbs_up_count = 0
    thumbs_down_count = 0

    thumb_up_rows = db((post_id == db.thumb.post_id) & (db.thumb.thumb_state == 'u')).select()
    thumb_down_rows = db((post_id == db.thumb.post_id) & (db.thumb.thumb_state == 'd')).select()

    for row in thumb_up_rows:
        # print "going up"
        thumbs_up_count += 1

    for row in thumb_down_rows:
        # print "going down"
        thumbs_down_count += 1

    result = thumbs_up_count - thumbs_down_count

    # print "response is", int(result)
    result = int(result)
    return response.json(dict(result=result))

@auth.requires_login()
def get_post_author():
    post_id = int(request.vars.post_id)
    post = db(post_id == db.post.id).select().first()

    if post.post_author == auth.user.email:
        # print "found 1"
        return response.json(dict(result=1))
    else:
        # print "found none"
        return response.json(dict(result=0))

@auth.requires_login()
def edit_post_content():
    post_id = int(request.vars.post_id)
    new_content = (request.vars.new_text)
    new_title = (request.vars.new_title) 
    post = db(post_id == db.post.id).select().first()

    # if post.post_author == auth.user.email:
    post.update_record(post_content=new_content)
    post.update_record(post_title=new_title) 

    return "🤯"

def add_reply():
    reply_id = db.reply.insert(
        post_id = int(request.vars.post_id),
        reply_content=request.vars.reply_content,
    )
    # print "reply_id: ", reply_id.post_id
    # print "reply_content: ", reply_id.reply_content
    # print "reply_author: ", reply_id.reply_author

    return response.json(dict(
        reply_id = reply_id.post_id,
        reply_content = reply_id.reply_content,
        reply_author = reply_id.reply_author))

def get_post_replies():
    post_id = int(request.vars.post_id)
    results = []

    reply_rows = db(post_id == db.reply.post_id).select()

    for row in reply_rows:
        results.append(dict(
            id = row.id,
            reply_content = row.reply_content,
            reply_author = row.reply_author
        ))

    return response.json(dict(reply_list=results))

def get_reply_author():
    reply_id = int(request.vars.reply_id)
    reply = db(reply_id == db.reply.id).select().first()

    if reply.reply_author == auth.user.email:
        return response.json(dict(result=1))

    return response.json(dict(result=0))

def edit_reply():
    reply_id = int(request.vars.reply_id)
    new_content = (request.vars.reply_content)
    reply = db(reply_id == db.reply.id).select().first()

    if reply.reply_author == auth.user.email:
        reply.update_record(reply_content = new_content)


@auth.requires_login()
def post_image():
    picture = request.vars.picture
    post_id = int(request.vars.post_id)
    print picture
    # Normally, here I would have to check that the user can store the 
    # image to the blog post, etc etc.
    db.my_images.update_or_insert(
        (db.my_images.post_id == post_id),
        post_id = post_id,
        picture = picture
    )

def get_image():
    post_id = int(request.vars.post_id)
    r = db(db.my_images.post_id == post_id).select().first()
    # r.picture_file = ""
    return response.json(dict(r=r))
    


# Gets the info of the respective post based on post id
def get_post():
    # print "Printed if got to API"
    post_id = int(request.vars.post_id) 
    post = db(post_id == db.post.id).select().first()

    # print "This is the post_id: ", post_id
    # print "This is the post: ", post
    # print "The get_post api got to the end right before the return"
    return response.json(dict(post = post))   

