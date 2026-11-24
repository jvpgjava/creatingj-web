pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 15, unit: 'MINUTES')
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci --no-audit'
            }
        }

        stage('Test') {
            steps {
                sh 'npx ng test --watch=false'
            }
        }

        stage('Build Production') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Security Bundle Check') {
            steps {
                sh '''
                    if grep -rnE "(STAC_API_KEY|CRJ_API_KEY|sk-[A-Za-z0-9]{16,}|bypassSecurityTrustHtml)" dist/creatingj-web/browser/; then
                        echo "ERRO: padrao proibido encontrado no bundle de producao!"
                        exit 1
                    fi
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'dist/creatingj-web/browser/**', allowEmptyArchive: true
        }
    }
}
