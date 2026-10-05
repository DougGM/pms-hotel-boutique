pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    stages {
        stage('Checkout & Setup') {
            steps {
                checkout scm
                sh 'npm ci'
            }
        }

        stage('Validation') {
            steps {
                sh 'npm run check'
            }
        }

        stage('Tests & Coverage') {
            steps {
                sh 'npm run test:coverage --if-present'
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=pms-hotel-boutique-frontend \
                          -Dsonar.sources=src \
                          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                          -Dsonar.token="$SONAR_TOKEN"
                    '''
                }
            }
        }

        stage('Build Production') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    buildingTag()
                }
            }
            steps {
                sh 'npm run build'
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
