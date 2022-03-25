import { Client } from "@notionhq/client"
import medium  from '@giuseppecampanelli/medium-api'
import dotenv  from "dotenv"
import schedule  from "node-schedule"
import  winston from "winston";

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.timestamp(),
  transports: [ 
    new winston.transports.Console({format: winston.format.simple()}),
    new winston.transports.File({ filename: 'medium-notion-importer.log' }),
  ],
});

dotenv.config()

const notion = new Client({ auth: process.env.NOTION_KEY })
const databaseId = process.env.NOTION_DATABASE_ID

async function addItem(id,title,categories,pubDate,url) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: { 
          title:[
            {
              "text": {
                "content": title
              }
            }
          ]
        },
        URL: { 
          url: url
           
        },
        ID: { 
          rich_text:[
            {
              "text": {
                "content": id
              }
            }
          ]
        },
        'Publication Date': { 
              "date": {
                "start": pubDate
              }
            
          
        },
        Tags: { 
          multi_select: categories.map(element => {
            return  {"name": element }
          }) 
        }
      },
    })
    logger.info("Success! Entry added.")
  } catch (error) {
    logger.error(error.body)
  }
}



const job = schedule.scheduleJob(process.env.SCHEDULER_CRON, async function(){
  logger.info("Launching synchronization process..")

  const response = await notion.databases.query({
    database_id: databaseId
  });


  var map_id = {};


  response.results.forEach(element => {
    if (element.properties.ID.rich_text[0].plain_text != null) {
      map_id[element.properties.ID.rich_text[0].plain_text]='1'
    }
  });

  medium.profile.getRecentPosts(process.env.MEDIUM_USER_ID).then(res => {
    // handle result
    res.forEach(element => {
      if (map_id[element.guid] == null){
        addItem(element.guid,element.title,element.categories,element.pubDate,element.link)
      }
    });
      
  })

  logger.info("Ended synchronization process..")

});


logger.info("# Medium Notion Sync # - Launched")


