import { Github, ExternalLink, MessageSquare, Users, Lightbulb } from 'lucide-react';

export const Community: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="max-w-2xl mx-auto text-center space-y-8">
                {/* Main Card */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-12 shadow-lg">
                    <Github size={64} className="mx-auto text-gray-900 mb-6" />
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Join the Discussion</h2>
                    <p className="text-gray-700 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
                        Connect with other automotive engineers, share your projects, ask questions, and contribute to the AutoLearn community on GitHub Discussions.
                    </p>
                    <a
                        href="https://github.com/Anant1711/AutoLearn/discussions/1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        <Github size={24} />
                        Open GitHub Discussions
                        <ExternalLink size={18} />
                    </a>
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <MessageSquare size={32} className="text-cyan-500 mb-3 mx-auto" />
                        <h3 className="font-bold text-gray-900 mb-2">Ask Questions</h3>
                        <p className="text-sm text-gray-600">Get help from the community</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <Users size={32} className="text-blue-500 mb-3 mx-auto" />
                        <h3 className="font-bold text-gray-900 mb-2">Share Projects</h3>
                        <p className="text-sm text-gray-600">Show off your DBC files</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <Lightbulb size={32} className="text-yellow-500 mb-3 mx-auto" />
                        <h3 className="font-bold text-gray-900 mb-2">Suggest Ideas</h3>
                        <p className="text-sm text-gray-600">Help shape the future</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
