#!/bin/bash

function test-init {
  waffer new test-project > /dev/null
  cd test-project
}

function test-cleanup {
  cd ..
  rm -rf test-project
}

test-init
waffer export > /dev/null
rm -rf ../export-0
mv html ../export-0
test-cleanup

test-init
waffer view my-view > /dev/null
waffer export > /dev/null
rm -rf ../export-1
mv html ../export-1
test-cleanup

test-init
waffer component my-component > /dev/null
waffer export > /dev/null
rm -rf ../export-2
mv html ../export-2
test-cleanup
