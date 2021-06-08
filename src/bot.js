require("dotenv").config();  


console.log(process.env.DISCORD_BOT_TOKEN );
console.log(process.env.WIT_API_KEY);
client_id = process.env.DISCORD_BOT_TOKEN;
const Discord = require("discord.js");
const util = require('util');
const client = new  Discord.Client(); 

var stop = false
let phrases = null;


var fs=require('fs');
var phrase_data=fs.readFileSync('Phrases.json', 'utf8');
phrases =JSON.parse(phrase_data);

function update_phrase_file(phrases){
    var dictstring = JSON.stringify(phrases);
    fs.writeFile("Phrases.json", dictstring, function(err, result) {
    if(err) console.log('error', err);
    });
}

client.on("ready",()=>{
    console.log("bot has logged in");
})

client.on('message', msg => {
    const prefix = "?";
    command = msg.content;
    member = msg.member;
    member_channel_ID= member.voice.channelID;
    var guild_ID = member.guild.id;
    if(command.charAt(0) != prefix) return; 
    command = command.slice(prefix.length)
    command = command.split(" ")
    if (command[0] === 'join') {
        if(member_channel_ID == null ){ 
            msg.reply("Not in a channel");
            return
        }
        const channel = client.channels.cache.get(member_channel_ID);
        if (!channel) return console.error("The channel does not exist!");
        connect(channel, guild_ID) 
    }

    else if(command[0] == "add"){
        if(command.length < 3){ 
            msg.reply("Wrong Format")
            return 
        }
        new_phrase = command.slice(1,command.length-1).join(" ").toLowerCase();
        url = command[command.length-1];
        console.log(new_phrase)
        console.log(url)
        if(guild_ID in phrases){
            let guild_phrases = phrases[guild_ID]
            guild_phrases[new_phrase] = url 
        }else{
            let guild_phrases = {} 
            phrases[guild_ID] = guild_phrases; 
            guild_phrases[new_phrase] = url 
        }
        console.log(phrases)
        update_phrase_file(phrases)
    }
    else if(command[0] == "phrases"){
        if(guild_ID in phrases){
            let guild_phrases = phrases[guild_ID]
            string_phrases = []
            for(let keys in guild_phrases){
                string_phrases.push(keys)
            }
            string_phrases = string_phrases.join(" \n ")
            msg.reply(JSON.stringify(string_phrases))
        }else{
            msg.reply("There currently are no set phrases")
        }
    }
    else{
        msg.reply("Not a command")
    }

});

client.login(client_id);

async function connect(channel, guild_ID){
    try{
        let voice_connection = await channel.join() 
        stop = false
        listen(voice_connection, guild_ID)
    }catch(e){
        console.log('connect: ' + e)
        msg.reply('Error: unable to join your voice channel.');
        throw e;
    }
};
function listen(voice_connection, guild_ID){
    voice_connection.on('speaking', async (user, speaking) => {
        if(stop == true)
            return
        if (speaking.bitfield == 0 || user.bot) {
            return
        }
        console.log(`I'm listening to ${user.username}`)
        // this creates a 16-bit signed PCM, stereo 48KHz stream 
        const audio_stream = voice_connection.receiver.createStream(user, { mode: 'pcm' })
        audio_stream.on('error',  (e) => { 
            console.log('audio_stream: ' + e)
        });
        let buffer = [];
        audio_stream.on('data', (data) => {
            buffer.push(data)
        })

        audio_stream.on('end', async () => {
            buffer = Buffer.concat(buffer)
            const duration = buffer.length / 48000 / 4;
            console.log("duration: " + duration)
            if (duration < 1 || duration > 19) { // 20 seconds max dur
                console.log("TOO SHORT / TOO LONG; SKPPING")
                return;
            }

            try {
                let new_buffer = await create_audio_buffer(buffer)
                let out = await transcribe(new_buffer);
                if (out != null)
                    await process_lyric(out,voice_connection, guild_ID)
                    // process_commands_query(out, mapKey, user.id);
            } catch (e) {
                console.log('tmpraw rename: ' + e)
            }


        })
    })
};
async function create_audio_buffer(buffer){
    try {
        const data = new Int16Array(buffer)
        const ndata = new Int16Array(data.length/2)
        for (let i = 0, j = 0; i < data.length; i+=4) {
            ndata[j++] = data[i]
            ndata[j++] = data[i+1]
        }
        return Buffer.from(ndata);
    } catch (e) {
        console.log(e)
        console.log('convert_audio: ' + e)
        throw e;
    }

}
//Google Speech 

const gspeech = require('@google-cloud/speech');
const gspeechclient = new gspeech.SpeechClient({
  projectId: 'discordbot',
  keyFilename: 'Sing-Along-Bot-8ebb50c24400.json'
});

async function transcribe(audio_buffer){
    try {
        console.log('transcribe_gspeech')
        const bytes = audio_buffer.toString('base64');
        const audio = {
          content: bytes,
        };
        const config = {
          encoding: 'LINEAR16',
          sampleRateHertz: 48000,

          languageCode: "en-US",  // https://cloud.google.com/speech-to-text/docs/languages
        };
        //"cmn-Hans-CN"
        //'en-US'
        const request = {
          audio: audio,
          config: config,
        };
  
        const [response] = await gspeechclient.recognize(request);
        const transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        console.log(`gspeech: ${transcription}`);
        return transcription;
  
    } catch (e) { console.log('transcribe_gspeech 368:' + e) }
}


//Music

const ytdl = require('ytdl-core');
async function process_lyric(transcription, voice_connection, guild_ID){
    // const songInfo = await ytdl.getInfo("Backstreet Boys - I Want It That Way (Official HD Video)");
    // const song = {
    // title: songInfo.videoDetails.title,
    // url: songInfo.videoDetails.video_url,
    // };
    // print(song)
    trans = transcription.toLowerCase() 
    if(guild_ID in phrases){
        let guild_phrases = phrases[guild_ID]
        if(trans in guild_phrases){
            console.log(guild_phrases[trans]);
            await play(guild_phrases[trans], voice_connection);
        }
    }else{
        return
    }
    // if(trans == "i want it that way"){
    //    await play("https://www.youtube.com/watch?v=4fndeDfaWCg", voice_connection)
    // }
    // else if(trans == "call me maybe"){
    //    await play("https://www.youtube.com/watch?v=fWNaR-rxAic", voice_connection)
    // }
    // else if(trans == "shut the fuk up"){
    //     await play("https://www.youtube.com/watch?v=OLpeX4RRo28", voice_connection)
    // }
    // else if(trans == "one thing"){
    //     await play("https://www.youtube.com/watch?v=Y1xs_xPb46M", voice_connection)
    // }
    // else if(trans == "i used to rule the world"){
    //     await play('https://www.youtube.com/watch?v=I-sH53vXP2A', voice_connection)
    // }
    // else if(trans =="light it up like dynamite"){ 
    //     await play("https://www.youtube.com/watch?v=gdZLi9oWNZg", voice_connection)
    // }
    // else if(trans == "something just like this"){
    //     await play("https://www.youtube.com/watch?v=FM7MFYoylVs", voice_connection)
    // }
    // else if(trans == "i'm at a payphone"){
    //     await play("https://www.youtube.com/watch?v=LNArCBr6rrs", voice_connection)
    // }
    // else if(trans == "you belong with me"){
    //     await play("https://www.youtube.com/watch?v=VuNIsY6JdUw", voice_connection)
    // }
    // else if(trans == "everytime we touch"){
    //     await play("https://www.youtube.com/watch?v=4G6QDNC4jPs", voice_connection)
    // }
}   

async function play(url,voice_connection){
    const dispatcher = voice_connection.play(ytdl(url)).on("error", error => console.error(error))
    .on("start", () =>
        stop = true 
    )
    .on("finish", () => {
        stop = false
    });
}