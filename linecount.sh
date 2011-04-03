FILES="public/index.html public/main.css public/main.js rws1/server.rb"
for FILE in $FILES
do
    wc -l $FILE
done
