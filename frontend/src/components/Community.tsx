import { Github, ExternalLink, MessageSquare, Users, Lightbulb } from 'lucide-react';

export const Community: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-full p-4 md:p-0">
            <div className="max-w-2xl mx-auto text-center space-y-6 md:space-y-8">
                {/* Main Card */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 md:p-12 shadow-lg">
                    <Github size={48} className="mx-auto text-gray-900 mb-4 md:mb-6 md:w-16 md:h-16" />
                    <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">Join the Discussion</h2>
                    <p className="text-gray-700 text-sm md:text-lg mb-6 md:mb-8 max-w-xl mx-auto leading-relaxed">
                        Connect with other automotive engineers, share your projects, ask questions, and contribute to the AutoLearn community on GitHub Discussions.
                    </p>
                    <a
                        href="https://github.com/Anant1711/AutoLearn/discussions/1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm md:text-base"
                    >
                        <Github size={20} className="md:w-6 md:h-6" />
                        Open GitHub Discussions
                        <ExternalLink size={16} className="md:w-[18px] md:h-[18px]" />
                    </a>
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
                        <MessageSquare size={28} className="text-cyan-500 mb-2 md:mb-3 mx-auto md:w-8 md:h-8" />
                        <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Ask Questions</h3>
                        <p className="text-xs md:text-sm text-gray-600">Get help from the community</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
                        <Users size={28} className="text-blue-500 mb-2 md:mb-3 mx-auto md:w-8 md:h-8" />
                        <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Share Projects</h3>
                        <p className="text-xs md:text-sm text-gray-600">Show off your DBC files</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm">
                        <Lightbulb size={28} className="text-yellow-500 mb-2 md:mb-3 mx-auto md:w-8 md:h-8" />
                        <h3 className="font-bold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Suggest Ideas</h3>
                        <p className="text-xs md:text-sm text-gray-600">Help shape the future</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
