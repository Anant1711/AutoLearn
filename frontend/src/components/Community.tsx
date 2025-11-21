import React from 'react';
import { Users, MessageSquare, Share2, Heart } from 'lucide-react';

const POSTS = [
    {
        id: 1,
        user: 'AutoGeek99',
        title: 'Custom DBC for Tesla Model 3',
        content: 'I just reverse engineered some of the body control messages. Check out this DBC file!',
        likes: 45,
        comments: 12,
        time: '2h ago'
    },
    {
        id: 2,
        user: 'EmbeddedDev',
        title: 'Scenario: Engine Overheat',
        content: 'Created a new simulation scenario where the engine overheats if you idle too long. Great for testing warning indicators.',
        likes: 32,
        comments: 5,
        time: '5h ago'
    }
];

export const Community: React.FC = () => {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-xl p-8 text-center border border-cyan-500/20">
                <Users size={48} className="mx-auto text-cyan-400 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Join the Community</h2>
                <p className="text-gray-400 mb-6">Share your DBC files, custom scenarios, and learn from other automotive engineers.</p>
                <button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors">
                    Create Post
                </button>
            </div>

            <div className="space-y-4">
                {POSTS.map((post) => (
                    <div key={post.id} className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                                {post.user[0]}
                            </div>
                            <div>
                                <div className="font-bold text-white">{post.user}</div>
                                <div className="text-xs text-gray-500">{post.time}</div>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                        <p className="text-gray-400 text-sm mb-4">{post.content}</p>
                        <div className="flex items-center gap-6 text-gray-500 text-sm">
                            <button className="flex items-center gap-2 hover:text-red-400 transition-colors">
                                <Heart size={16} /> {post.likes}
                            </button>
                            <button className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                                <MessageSquare size={16} /> {post.comments}
                            </button>
                            <button className="flex items-center gap-2 hover:text-white transition-colors">
                                <Share2 size={16} /> Share
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
