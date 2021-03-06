var config = require('config');
var tmp = require('tmp');
var tmpobj = tmp.dirSync();
var git = require('simple-git')( tmpobj.name );
var path = require('path');
var jira_matcher = /\d+-[A-Z]+(?!-?[a-zA-Z]{1,10})/g
var reverse = require('reverse-string');
var JiraApi = require('jira-client');

// Initialize
var c_info = config.jira.connection_info;
var jira = new JiraApi(c_info);

/**
 *
 * @param s represents a commit message, that will be parsed for Jira_Issues keys, matched with Regex.
 * @returns {*}
 */
function getJiraIssue(s){
    s = reverse(s)
    var m = s.match(jira_matcher);
    for (var i = 0; i < m.length; i++) {
        m[i] = reverse(m[i])
    }
    m.reverse();
    return m;
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
    var issue_info = config.jira.new_issue_details;
    issue_info.fields.description = "This commit_sha is missing a JIRA_Key within the commit message.  Please correct by updating";
    issue_info.fields.description = issue_info.fields.description + "\r\nCommit Sha: " + commit_info.hash;
    issue_info.fields.description = issue_info.fields.description + "\r\nAuthor Name: " + commit_info.author_name;
    issue_info.fields.description = issue_info.fields.description + "\r\nAuthor Email: " + commit_info.author_email;
    issue_info.fields.description = issue_info.fields.description + "\r\nCommit Message: " + commit_info.message;
    jira.addNewIssue(issue_info).then(
        function(issue) {
        callback(null,issue);
    }).catch(function(err) {
        callback(err);
    });;

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
    git.clone(repoInfo.repo,path.join(tmpobj.name,repoInfo.name));
    git.cwd(path.join(tmpobj.name,repoInfo.name));
    git.checkout(repoInfo.branch);
    git.log({'--since': "24 hours ago"}, function(err,log){
        log.all.forEach(function(item){
            var issues = getJiraIssue(item.message);
            if (issues.length == 0) {
                createIssue(repoInfo,item,function(err,results){
                    if (err){
                        callback(err);
                    } else {
                        console.log('Created issue: ' + results);
                        callback(null)
                    }
                });
            }
        })
    });

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