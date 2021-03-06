$(document).ready(() => {
    //const store = new Storage()
    const data = {}
    
    loadExtension()
    function loadExtension() {
        const $html = $('html')
        const $document = $(document)
        data.mine = {}
        //获取当前登录者信息
        __api.getUser({id:''},function (result) {
            data.mine.id = result.id
            data.mine.username = result.name
            data.mine.avatar = result.portrait
            data.mine.sign = result.desc
            data.mine.status = "online"
        })
        //获取好友列表
        data.friend = [
            {"groupname": "我的关注","id": 1,"online": 0, list:[]},
            {"groupname": "我的粉丝","id": 2,"online": 0, list:[]}
        ]
        //关注
        getAllFirends(data.mine.id, "")
        //粉丝
        getAllFans(data.mine.id, "")
        //群组
        data.group = []
        
        //初始化-layim
        layui.layim.config({
            title: data.mine.username,
            blog_url : 'https://my.oschina.net/u/',
            notice: true,
            isgroup: false,
            init: {
                data : function (options, callback, tips) {
                    callback && callback(data||{})
                },
            }
        })
        
        //监听发送消息
        layui.layim.on('sendMessage', function(record) {
            var To = record.to;
            var content = record.mine.content;
            __api.sendMessage({authorId:To.id,content:content},function () {
                //发送成功
            })
        })
        
        //监听聊天窗口的切换
        layui.layim.on('chatChange', function(record){
            //第一次打开 获取历史数据gulp chrome
            var local = layui.data('layim')[data.mine.id] || {}
            local = local ? local.chatlog : {}
            if(!local || !local.hasOwnProperty("friend" + record.data.id) || local["friend" + record.data.id].length == 0){
                __api.getMessage({authorId:record.data.id},function (result) {
                    layui.each(result.items,function (index, item) {
                        layui.layim.pushChatlog({
                            username: item.sender.name,
                            avatar: item.sender.portrait,
                            id: record.data.id,
                            type: "friend",
                            content: item.content || (item.resource ? "img["+ item.resource +"]" : ""),
                            mine: data.mine.id == item.sender.id,
                            fromid: item.sender.id,
                            timestamp: new Date(item.pubDate).getTime()
                        });
                    })
                    //layui.layim.viewChatlog()
                })
            }else{
                //拉取最新的聊天信息
                __api.getMessage({authorId:record.data.id},function (result) {
                    layui.each(result.items,function (index, item) {
                        //验证最后聊天记录
                        var logs = local["friend" + record.data.id];
                        var last = logs[logs.length - 1];
                        if(last.timestamp < new Date(item.pubDate).getTime()){
                            layui.layim.pushChatlog({
                                username: item.sender.name,
                                avatar: item.sender.portrait,
                                id: record.data.id,
                                type: "friend",
                                content: item.content || (item.resource ? "img["+ item.resource +"]" : ""),
                                mine: data.mine.id == item.sender.id,
                                fromid: item.sender.id,
                                timestamp: new Date(item.pubDate).getTime()
                            });
                        }
                    })
                })
            }
        });
        //监听消息
        var heart = setInterval(checkMessage, 3000)
    }
    
    //循环获取好友--接口没有获取全部参数只能循环获取咯
    function getAllFirends(id, pageToken) {
        __api.getFriend({id:id,pageToken:pageToken}, function (result) {
            data.friend[0].online += result.requestCount
            if(result.nextPageToken && data.friend[0].online < result.totalResults){
                getAllFirends(id, result.nextPageToken)
            }
            layui.each(result.items,function (index, item) {
                data.friend[0].list.push({
                    username: item.name,
                    id: item.id,
                    avatar: item.portrait,
                    sign: item.desc,
                    gender: item.gender,
                })
            })
        })
    }
    //循环获取粉丝--接口没有获取全部参数只能循环获取咯
    function getAllFans(id, pageToken) {
        __api.getFans({id:id,pageToken:pageToken}, function (result) {
            data.friend[1].online += result.requestCount
            if(result.nextPageToken && data.friend[1].online < result.totalResults){
                getAllFans(id, result.nextPageToken)
            }
            layui.each(result.items,function (index, item) {
                data.friend[1].list.push({
                    username: item.name,
                    id: item.id,
                    avatar: item.portrait,
                    sign: item.desc,
                    gender: item.gender,
                })
            })
        })
    }
    
    function checkMessage(){
        __api.getNotice({clear:false},function (data) {
            if(data.letter > 0){
                //匹配新消息
                $.get("https://"+ location.host +"/action/newMsg/list?t=1&p=1",function (html) {
                    var $dom = $(html);
                    $dom.find(".message-panel").find(".unread-message").each(function () {
                        var $item = $(this).parent().parent().parent().parent().parent()
                        var id = $item.attr('onclick').replace("page.msgLive(","").replace(")","")
                        var message = {}
                        __api.getUser({id:id},function (result) {
                            message.type = "friend"
                            message.id = result.id
                            message.username = result.name
                            message.avatar = result.portrait
                            message.mine = false
                            layui.layim.getMessage(message)
                        })
                    });
                })
            }
        })
    }
})