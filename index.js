let config = require('config')
    tmp = require('tmp')
    tmpobj = tmp.dirSync()
    git = require('simple-git')( tmpobj.name )
    path = require('path')
    jira_matcher = /\d+-[A-Z]+(?!-?[a-zA-Z]{1,10})/g
    reverse = require('reverse-string')
    JiraApi = require('jira-client')

// Initialize
let c_info = config.jira.connection_info
    jira = new JiraApi(c_info)

/**
 *
 * @param s represents a commit message, that will be parsed for Jira_Issues keys, matched with Regex.
 * @returns {*}
 */
function getJiraIssue(s){
    s = reverse(s)
    m = s.match(jira_matcher)
    for (i = 0; i < m.length; i++) {
        m[i] = reverse(m[i])
    }
    m.reverse()
    return m
}

/**
 *
 * @param commit_info
 * Example:
 *     { name: 'com.dartfleet.web',
         repo: 'https://charles_russell@bitbucket.org/webteks/com.dartfleet.web.git',
         branch: 'develop'
       }
 * @param callback(err,results);
 */
function createIssue(repoInfo,commit_info,callback){
    let issue_info = config.jira.new_issue_details
    issue_info.fields.description = "This commit_sha is missing a JIRA_Key within the commit message.  Please correct by updating";
    issue_info.fields.description += "\r\nCommit Sha: " + commit_info.hash
    issue_info.fields.description += "\r\nAuthor Name: " + commit_info.author_name
    issue_info.fields.description += "\r\nAuthor Email: " + commit_info.author_email
    issue_info.fields.description += "\r\nCommit Message: " + commit_info.message
    jira.addNewIssue(issue_info).then(
        function(issue) {
        callback(null,issue)
    }).catch(function(err) {
        callback(err)
    });
}

/**
 *
 * @param repoInfo
 *          Example:
 *          {
              "name": "com.dartfleet.web",
              "repo": "https://charles_russell@bitbucket.org/webteks/com.dartfleet.web.git",
              "branch": "develop"
            }
 * @param callback(err,results);
 */
function processRepo(repoInfo,callback){
    git.clone(repoInfo.repo,path.join(tmpobj.name,repoInfo.name))
        .cwd(path.join(tmpobj.name,repoInfo.name))
        .checkout(repoInfo.branch)
        .log({'--since': "24 hours ago"}, function(err,log){
        log.all.forEach(function(item){
            let issues = getJiraIssue(item.message)
            if (issues.length != 0) {
                createIssue(repoInfo,item,function(err,results){
                    if (err){
                        callback(err)
                    } else {
                        console.log('Created issue: ' + results)
                        callback(null)
                    }
                })
            }
        })
    })

}

/**
 * cloneAllAndProcess repositories found in default.json and processes them.
 */
function cloneAllAndProcess(){
    config.repositories.forEach(function(item){
        processRepo(item,function(err){
            if(err){
                console.log(err);
            } else {
                console.log('Completed processing');
                process.exit();
            }

        })
    })
}

cloneAllAndProcess();