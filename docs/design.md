Goal: implement a client for a quiz game for the host.

The client will be a web application that allows the host to create and manage quiz games and others to join as spectators.

There should be 4 views:
- Creating view
- Board view
- Question view
- Results view

## Creating view
Host selects:
- Question pack
  
Host provide game settings:
- Round time
- Mistake penalty percentage

Host creates teams by providing team names and optionally uploading team logos.

When game is created, host is redirected to the board screen and spectators can join the game.
Only one game can be active at a time.

## Board view
Board shows a questions grid with categories and question values, example is here qq.png

Also there are team blocks on the buttom of the view, showing team names, scores, and logos.

Host can click on a cell to select a question. Once a question is selected, the question view is displayed

## Question view

### For host
Selected question, answer, and team blocks, finish button are displayed. The host selects the team that answer the question. The host can also mark the answer as correct or incorrect. If the answer is correct, the team gets points according to the question value. If the answer is incorrect, the team gets a penalty according to the mistake penalty percentage. After marking the answer, the host can go back to the board view by clicking a "finish" button.

### For spectators
In the question view, the selected question is displayed. When team is selected to answer, team name is displayed to spectators on the bottom of the view, like "Team A is answering..."

When the host marks the answer as correct or incorrect, a message is displayed to spectators, like "Team A answered correctly!" or "Team A answered incorrectly!" and sound effects are played accordingly.

When last question of the round is finished, the host is redirected to the results view.

## Results view

In the results view, the final scores of all teams are displayed. The host can see the ranking of teams based on their scores. Spectators can also view the final results. Teams are displayed from top to bottom, with the team having the highest score at the top. Winner is highlighted and scaled a bit larger than the other teams. 

## Common rules
- All wording should be in Russian.