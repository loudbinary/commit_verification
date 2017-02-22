## Git commit verification

Simple script that can be scheduled, which for each repo configured will perform following: 

* To a temp directory, will clone repository.
* For each repository, checking configured branch. 
* Pull last 24 hours of commits to repository
* Check each commit found, verify that a JIRA Issue key was provided. 
* If no Jira key found, then a new issue is created in Jira stating commit_sha is missing Jira Issue
* Provide instructions on how to update the commit to include the JIRA Issue. 


