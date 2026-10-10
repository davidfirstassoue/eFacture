using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace BCIHopital
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            
            // 1. Vérifier si le serveur écoute déjà sur le port 3000
            bool alreadyRunning = false;
            try
            {
                using (var client = new System.Net.Sockets.TcpClient())
                {
                    var result = client.BeginConnect("127.0.0.1", 3000, null, null);
                    alreadyRunning = result.AsyncWaitHandle.WaitOne(400);
                }
            }
            catch {}

            // Si pas encore lancé, démarrer le serveur Node.js embarqué en arrière-plan silencieux
            if (!alreadyRunning)
            {
                string localNode = Path.Combine(appDir, "node.exe");
                string nodeExe = File.Exists(localNode) ? localNode : "node.exe";

                ProcessStartInfo serverInfo = new ProcessStartInfo();
                serverInfo.FileName = nodeExe;
                serverInfo.Arguments = "\"" + Path.Combine(appDir, "server.js") + "\"";
                serverInfo.WorkingDirectory = appDir;
                serverInfo.WindowStyle = ProcessWindowStyle.Hidden;
                serverInfo.CreateNoWindow = true;
                serverInfo.UseShellExecute = false;

                try
                {
                    Process.Start(serverInfo);
                    Thread.Sleep(1200);
                }
                catch (Exception ex)
                {
                    System.Windows.Forms.MessageBox.Show("Erreur au démarrage du serveur : " + ex.Message, "BCI Hôpital", System.Windows.Forms.MessageBoxButtons.OK, System.Windows.Forms.MessageBoxIcon.Error);
                    return;
                }
            }

            // 2. Ouvrir l'application en mode fenêtre dédiée autonome (sans barre d'adresse)
            try
            {
                ProcessStartInfo edgeApp = new ProcessStartInfo();
                edgeApp.FileName = "msedge.exe";
                edgeApp.Arguments = "--app=http://localhost:3000";
                Process.Start(edgeApp);
            }
            catch
            {
                // Fallback navigateur par défaut
                Process.Start(new ProcessStartInfo("http://localhost:3000") { UseShellExecute = true });
            }
        }
    }
}
